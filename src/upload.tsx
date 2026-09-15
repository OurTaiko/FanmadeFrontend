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
  Upload,
} from 'lucide-react'
import { CategoryPicker } from './categories'
import { uploadChart } from './api'
import { Modal } from './notifications'
import { useNotification } from './notification-context'
import { courseNames, DifficultyBadges, Notice } from './components'
import { useSession } from './session-context'
import { isAudioFilename, validateFiles } from './tja'
import type { PreparedTja } from './tja'
import { isSupportedCourse } from './courses'

function createRequestKey() {
  // getRandomValues remains available over LAN HTTP, unlike randomUUID.
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function UploadPage() {
  const { notify } = useNotification()
  const session = useSession(),
    navigate = useNavigate()
  const [tja, setTja] = useState<File | null>(null),
    [audio, setAudio] = useState<File | null>(null)
  const [metadata, setMetadata] = useState<PreparedTja | null>(null),
    [validating, setValidating] = useState(false),
    [validationError, setValidationError] = useState('')
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [description, setDescription] = useState(''),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [audioUrl, setAudioUrl] = useState('')
  const requestKey = useRef(createRequestKey()),
    controller = useRef<AbortController | null>(null)
  const reset = () => {
    setMetadata(null)
    setValidationError('')
    requestKey.current = createRequestKey()
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
    validateFiles(tja, audio)
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
  }, [tja, audio])
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
      tracks = files.filter((f) => isAudioFilename(f.name))
    reset()
    if (charts.length > 1 || tracks.length > 1 || charts.length + tracks.length !== files.length) {
      notify('请拖入一个 TJA 和一个 OGG 或 MP3 音频，不接受额外文件', 'error')
      return
    }
    if (charts[0]) setTja(charts[0])
    if (tracks[0]) setAudio(tracks[0])
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!tja || !audio || !metadata || busy) return
    setBusy(true)
    setProgress(0)
    const abort = new AbortController()
    controller.current = abort
    try {
      const prepared = await validateFiles(tja, audio)
      if (abort.signal.aborted) return
      const form = new FormData()
      form.append('tja', prepared.file)
      form.append('audio', audio)
      form.append('encoding', 'utf-8')
      form.append('description', description)
      form.append('categoryIds', JSON.stringify(categoryIds))
      form.append(
        'difficultyMakers',
        JSON.stringify(
          metadata.difficulties.map(({ blockIndex, maker }) => ({ blockIndex, maker })),
        ),
      )
      const chart = await uploadChart(
        form,
        session.csrfToken,
        requestKey.current,
        abort.signal,
        setProgress,
      )
      navigate(`/charts/${chart.id}`)
      notify('谱面已发布。', 'success')
    } catch (e) {
      if (!abort.signal.aborted) notify((e as Error).message, 'error')
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
          <p>准备好 TJA 和对应的 OGG 或 MP3 音频，支持简单、普通、困难、魔王和里谱。</p>
        </div>
      </div>
      {!session.loading && !session.user && (
        <Notice kind="info" title="登录后即可发布">
          你可以先选择文件检查谱面与音频是否匹配，发布前请通过右上角登录或注册。
        </Notice>
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
                      <b>{kind === 'tja' ? 'TJA 谱面' : 'OGG / MP3 音频'}</b>
                      <small>
                        {file
                          ? file.name
                          : kind === 'tja'
                            ? '.tja · 最大 2 MiB'
                            : '.ogg / .mp3 · 最大 100 MiB'}
                      </small>
                    </span>
                    {file ? <Check size={18} /> : <span className="choose-label">选择</span>}
                    <input
                      type="file"
                      aria-label={kind === 'tja' ? '选择 TJA 谱面' : '选择 OGG 或 MP3 音频'}
                      accept={kind === 'tja' ? '.tja' : '.ogg,.mp3'}
                      disabled={busy}
                      onChange={(e) => choose(kind, e)}
                    />
                  </label>
                )
              })}
            </div>
            {validationError && <Notice title="文件校验未通过">{validationError}</Notice>}
            {metadata && (
              <Notice
                kind="success"
                title="本地校验通过"
              >{`已自动识别为 ${metadata.sourceEncoding}，上传文件统一使用 UTF-8。WAVE: ${metadata.wave} 与所选音频一致。`}</Notice>
            )}
          </section>
          <section className="panel description-panel">
            <CategoryPicker
              value={categoryIds}
              disabled={busy}
              onChange={(ids) => {
                setCategoryIds(ids)
                requestKey.current = createRequestKey()
              }}
            />
          </section>
          {metadata && (
            <section className="panel maker-panel">
              <h2>难度与制作者</h2>
              <p className="muted">
                {metadata.maker
                  ? '已用谱面中的 MAKER 填入默认署名，你可以分别修改。'
                  : '谱面未填写 MAKER，你可以分别填写各难度的制作者。'}
              </p>
              <table className="maker-table">
                <thead>
                  <tr>
                    <th scope="col">难度</th>
                    <th scope="col">制作者</th>
                  </tr>
                </thead>
                <tbody>
                  {metadata.difficulties.map((d) => (
                    <tr key={d.blockIndex}>
                      <th scope="row">
                        {isSupportedCourse(d.course) ? courseNames[d.course] : d.course} ·{' '}
                        {d.course} ★{d.level}
                        {d.player && ` · ${d.player}`} <small>#{d.blockIndex + 1}</small>
                      </th>
                      <td>
                        <input
                          aria-label={`${d.course}${d.player ? ` ${d.player}` : ''} 制作者 #${d.blockIndex + 1}`}
                          value={d.maker}
                          maxLength={500}
                          placeholder="未填写"
                          disabled={busy}
                          onChange={(e) => {
                            const maker = e.target.value
                            setMetadata(
                              (current) =>
                                current && {
                                  ...current,
                                  difficulties: current.difficulties.map((block) =>
                                    block.blockIndex === d.blockIndex ? { ...block, maker } : block,
                                  ),
                                },
                            )
                            requestKey.current = createRequestKey()
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
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
                requestKey.current = createRequestKey()
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
                  <dd>
                    {[
                      ...new Set(metadata.difficulties.map((d) => d.maker.trim()).filter(Boolean)),
                    ].join(' | ') || '未填写'}
                  </dd>
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
              <button
                type="submit"
                className="button primary full"
                disabled={!metadata || validating || busy || !session.user}
              >
                {busy ? <LoaderCircle className="spin" size={18} /> : <Upload size={18} />}{' '}
                {busy ? '正在发布…' : validating ? '正在校验…' : '发布谱面'}
                {!busy && <ArrowRight size={17} />}
              </button>
              {busy && (
                <Modal
                  title="正在发布谱面"
                  busy
                  onDismiss={() => {}}
                  actions={
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => controller.current?.abort()}
                    >
                      取消上传
                    </button>
                  }
                >
                  <div className="upload-progress" role="status">
                    <progress max={100} value={progress} />
                    <span>
                      {progress < 100 ? `正在上传 ${progress}%` : '上传完成，正在校验并保存…'}
                    </span>
                  </div>
                </Modal>
              )}
              <p>发布后，其他人可以浏览、试听并下载你的作品。</p>
            </div>
          </section>
          <button
            type="button"
            className="button ghost full"
            onClick={() =>
              notify(
                'TJA 中的 WAVE 文件名必须与所选音频一致，包括大小写。音频支持 OGG / MP3，最大 100 MiB；TJA 最大 2 MiB。服务器会再次校验文件。',
                'info',
                '上传规则',
              )
            }
          >
            查看上传规则
          </button>
        </aside>
      </form>
    </>
  )
}
