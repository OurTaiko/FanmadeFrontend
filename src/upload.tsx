import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  Check,
  FileMusic,
  LoaderCircle,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react'
import { uploadChart } from './api'
import { DifficultyBadges, Notice } from './components'
import { useSession } from './session-context'
import { validateFiles } from './tja'
import type { Metadata } from './tja'

export function UploadPage() {
  const session = useSession(),
    navigate = useNavigate()
  const [tja, setTja] = useState<File | null>(null),
    [audio, setAudio] = useState<File | null>(null),
    [encoding, setEncoding] = useState('utf-8')
  const [metadata, setMetadata] = useState<Metadata | null>(null),
    [validating, setValidating] = useState(false),
    [validationError, setValidationError] = useState('')
  const [error, setError] = useState(''),
    [description, setDescription] = useState(''),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [audioUrl, setAudioUrl] = useState('')
  const requestKey = useRef(crypto.randomUUID()),
    controller = useRef<AbortController | null>(null)
  const reset = () => {
    setMetadata(null)
    setValidationError('')
    setError('')
    requestKey.current = crypto.randomUUID()
  }
  useEffect(() => {
    let active = true
    setMetadata(null)
    setValidationError('')
    if (!tja || !audio) {
      setValidating(false)
      return
    }
    setValidating(true)
    validateFiles(tja, audio, encoding)
      .then((m) => {
        if (active) setMetadata(m)
      })
      .catch((e) => {
        if (active) setValidationError(e.message)
      })
      .finally(() => {
        if (active) setValidating(false)
      })
    return () => {
      active = false
    }
  }, [tja, audio, encoding])
  useEffect(() => {
    if (!audio) {
      setAudioUrl('')
      return
    }
    const url = URL.createObjectURL(audio)
    setAudioUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [audio])
  useEffect(() => () => controller.current?.abort(), [])
  const choose = (kind: 'tja' | 'audio', e: ChangeEvent<HTMLInputElement>) => {
    reset()
    const file = e.target.files?.[0] ?? null
    if (kind === 'tja') setTja(file)
    else setAudio(file)
  }
  const drop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (busy) return
    const files = Array.from(e.dataTransfer.files),
      charts = files.filter((f) => /\.tja$/i.test(f.name)),
      tracks = files.filter((f) => /\.ogg$/i.test(f.name))
    reset()
    if (charts.length > 1 || tracks.length > 1 || charts.length + tracks.length !== files.length) {
      setError('请拖入一个 TJA 和一个 OGG，不接受额外文件')
      return
    }
    if (charts[0]) setTja(charts[0])
    if (tracks[0]) setAudio(tracks[0])
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!tja || !audio || !metadata || busy) return
    setError('')
    setBusy(true)
    setProgress(0)
    const abort = new AbortController()
    controller.current = abort
    try {
      await validateFiles(tja, audio, encoding)
      if (abort.signal.aborted) return
      const form = new FormData()
      form.append('tja', tja)
      form.append('audio', audio)
      form.append('encoding', encoding)
      form.append('description', description)
      const chart = await uploadChart(
        form,
        session.csrfToken,
        requestKey.current,
        abort.signal,
        setProgress,
      )
      navigate(`/charts/${chart.id}`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
      controller.current = null
    }
  }
  return (
    <>
      <Link className="back-link" to="/">
        <ArrowLeft size={16} />
        返回发现
      </Link>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SHARE YOUR RHYTHM</div>
          <h1>
            发布你的谱面
            <span className="title-dot" />
          </h1>
          <p>准备好 TJA 和对应的 OGG，剩下的交给我们。</p>
        </div>
      </div>
      {!session.loading && !session.user && (
        <div className="notice">
          <Link to="/login">登录或注册</Link>
          后即可发布。你也可以先选择文件，检查谱面与音频是否匹配。
        </div>
      )}
      <form onSubmit={submit} className="upload-layout">
        <div>
          <section className="panel upload-panel">
            <div className="panel-heading">
              <h2>
                <span className="step">01</span>选择文件
              </h2>
              <span className="muted">两个文件，缺一不可</span>
            </div>
            <div className="file-drop" onDragOver={(e) => e.preventDefault()} onDrop={drop}>
              <Upload size={26} />
              <strong>把谱面与音频拖到这里</strong>
              <span>或点击下方选择文件</span>
            </div>
            <div className="file-inputs">
              {(['tja', 'audio'] as const).map((kind) => {
                const file = kind === 'tja' ? tja : audio
                return (
                  <label className={`file-picker ${file ? 'selected' : ''}`} key={kind}>
                    {kind === 'tja' ? <FileMusic size={24} /> : <AudioLines size={24} />}
                    <span>
                      <b>{kind === 'tja' ? 'TJA 谱面' : 'OGG 音频'}</b>
                      <small>
                        {file
                          ? file.name
                          : kind === 'tja'
                            ? '.tja · 最大 2 MiB'
                            : '.ogg · Vorbis · 最大 100 MiB'}
                      </small>
                    </span>
                    {file ? <Check size={18} /> : <span className="choose-label">选择</span>}
                    <input
                      type="file"
                      aria-label={kind === 'tja' ? '选择 TJA 谱面' : '选择 OGG 音频'}
                      accept={kind === 'tja' ? '.tja' : '.ogg'}
                      disabled={busy}
                      onChange={(e) => choose(kind, e)}
                    />
                  </label>
                )
              })}
            </div>
            <label className="encoding-field">
              TJA 文本编码
              <select
                value={encoding}
                disabled={busy}
                onChange={(e) => {
                  reset()
                  setEncoding(e.target.value)
                }}
              >
                <option value="utf-8">UTF-8（推荐 / ESE）</option>
                <option value="shift-jis">Shift-JIS</option>
              </select>
            </label>
            <div
              className={`validation-status ${metadata ? 'success' : validationError ? 'failed' : ''}`}
              role="status"
              aria-live="polite"
            >
              {validating ? (
                <>
                  <LoaderCircle className="spin" size={20} />
                  <div>
                    <b>正在检查文件…</b>
                    <p>读取 TJA 并核对音频引用</p>
                  </div>
                </>
              ) : validationError ? (
                <>
                  <X size={20} />
                  <div>
                    <b>文件校验未通过</b>
                    <p>{validationError}</p>
                  </div>
                </>
              ) : metadata ? (
                <>
                  <ShieldCheck size={22} />
                  <div>
                    <b>本地校验通过</b>
                    <p>WAVE: {metadata.wave} 与所选音频一致</p>
                  </div>
                </>
              ) : (
                <>
                  <ShieldCheck size={21} />
                  <div>
                    <b>等待选择文件</b>
                    <p>选择两个文件后，将自动核对 TJA 内的音频引用。</p>
                  </div>
                </>
              )}
            </div>
          </section>
          <section className="panel description-panel">
            <h2>
              <span className="step">02</span>写下投稿说明<span className="optional">选填</span>
            </h2>
            <label className="sr-only" htmlFor="description">
              投稿说明
            </label>
            <textarea
              id="description"
              rows={5}
              maxLength={1000}
              placeholder="介绍这份谱面的特色，或留下你想说的话…"
              value={description}
              disabled={busy}
              onChange={(e) => {
                setDescription(e.target.value)
                requestKey.current = crypto.randomUUID()
              }}
            />
            <span className="character-count">{description.length} / 1000</span>
          </section>
        </div>
        <aside>
          <section className="panel preview-panel">
            <div className="panel-heading">
              <h2>投稿预览</h2>
              <span className="preview-tag">PREVIEW</span>
            </div>
            {metadata ? (
              <>
                <div className="preview-art">
                  <AudioLines size={44} />
                  <span>{metadata.bpm} BPM</span>
                </div>
                <h3>{metadata.title}</h3>
                <p className="muted">{metadata.subtitle.replace(/^(--|\+\+)/, '') || '太鼓谱面'}</p>
                <DifficultyBadges difficulties={metadata.difficulties} />
                {audioUrl && (
                  <audio controls aria-label="本地音频试听" src={audioUrl} preload="metadata" />
                )}
                <dl className="metadata compact">
                  <dt>谱师</dt>
                  <dd>{metadata.maker || '未填写'}</dd>
                  <dt>上传者</dt>
                  <dd>{session.user?.username || '尚未登录'}</dd>
                </dl>
              </>
            ) : (
              <div className="preview-empty">
                <FileMusic size={40} />
                <p>
                  谱面信息将在校验通过后
                  <br />
                  自动出现在这里
                </p>
              </div>
            )}
            <div className="submit-area">
              {error && <Notice>{error}</Notice>}
              {busy && (
                <div className="upload-progress" role="status">
                  <progress max={100} value={progress} />
                  <span>
                    {progress < 100 ? `正在上传 ${progress}%` : '上传完成，正在校验并保存…'}
                  </span>
                </div>
              )}
              <button
                type="submit"
                className="button primary full"
                disabled={!metadata || validating || busy || !session.user}
              >
                {busy ? <LoaderCircle className="spin" size={18} /> : <Upload size={18} />}{' '}
                {busy ? '正在发布…' : '发布谱面'}
                {!busy && <ArrowRight size={17} />}
              </button>
              {busy && (
                <button
                  className="button ghost full"
                  type="button"
                  onClick={() => controller.current?.abort()}
                >
                  取消上传
                </button>
              )}
              <p>发布后，其他人可以浏览、试听并下载你的作品。</p>
            </div>
          </section>
          <div className="upload-tips">
            <ShieldCheck size={20} />
            <div>
              <b>文件对应，才能上传</b>
              <p>TJA 中的 WAVE 文件名必须与 OGG 一致，包括大小写。服务器还会独立校验一次。</p>
            </div>
          </div>
        </aside>
      </form>
    </>
  )
}
