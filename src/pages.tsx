import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Download,
  FileMusic,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
  Music2,
  Clock3,
  UserRound,
  Disc3,
  Pencil,
} from 'lucide-react'
import { api, jsonRequest, resource } from './api'
import type { Chart, ChartList } from './api'
import { ChartCard, Cover, DifficultyBadges, Notice, courseNames } from './components'
import { useSession } from './session-context'
import { EditMetadata } from './edit-metadata'
import { ChartActivity } from './chart-activity'
import { Modal } from './notifications'
import { useNotification } from './notification-context'
import { supportsChart } from './courses'
import { CategoryLabels } from './categories'

export function Library({ mine = false }: { mine?: boolean }) {
  const [params, setParams] = useSearchParams(),
    { user, loading: authLoading } = useSession()
  const [data, setData] = useState<ChartList | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true)
  const [query, setQuery] = useState(params.get('q') || '')
  const q = params.get('q') || '',
    course = params.get('course') || '',
    page = Math.max(1, Number(params.get('page')) || 1)
  useEffect(() => {
    if (mine && !user) return
    const controller = new AbortController()
    setLoading(true)
    setError('')
    api<ChartList>(
      `${mine ? '/me/charts' : '/charts'}?${new URLSearchParams({ q, course, page: String(page) })}`,
      { signal: controller.signal },
    )
      .then(setData)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [mine, user, q, course, page])
  if (mine && !user)
    return (
      <div className="empty">
        <FolderIcon />
        <h1>你的作品，从这里开始</h1>
        <p>{authLoading ? '正在读取账号…' : '登录后查看并管理你发布的谱面。'}</p>
        {!authLoading && (
          <Link className="button primary" to="/login">
            前往登录
            <ArrowRight size={16} />
          </Link>
        )}
      </div>
    )
  const update = (value: Record<string, string>) => setParams({ q, course, page: '1', ...value })
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">{mine ? 'MY COLLECTION' : 'CHART EXPLORER'}</div>
          <h1>
            {mine ? '我的作品' : '发现好谱。'}
            <span className="title-dot" />
          </h1>
          <p>
            {mine ? '管理你的投稿，把下一份灵感变成节拍。' : '寻找喜欢的节奏，听见谱师的灵感。'}
          </p>
        </div>
        <Link className="button primary" to="/upload">
          <Upload size={17} />
          发布谱面
        </Link>
      </div>
      <form
        className="filterbar"
        onSubmit={(e) => {
          e.preventDefault()
          update({ q: query })
        }}
      >
        <div className="search-box">
          <Search size={19} />
          <input
            aria-label="搜索谱面"
            placeholder="搜索曲名、谱师或上传者…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit">搜索</button>
        </div>
        <label className="filter-select">
          <SlidersHorizontal size={16} />
          <select
            aria-label="筛选难度"
            value={course}
            onChange={(e) => update({ course: e.target.value })}
          >
            <option value="">全部难度</option>
            {Object.entries(courseNames).map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </form>
      <div className="section-heading">
        <h2>
          {q ? `“${q}” 的搜索结果` : '最新发布'} <span>{data?.total ?? '—'}</span>
        </h2>
        <span className="muted">按发布时间排序</span>
      </div>
      {error ? (
        <Notice>{error}</Notice>
      ) : loading ? (
        <div className="chart-grid" aria-label="正在加载谱面">
          {[0, 1, 2].map((n) => (
            <div className="skeleton-card" key={n} />
          ))}
        </div>
      ) : data?.items.length ? (
        <>
          <div className="chart-grid">
            {data.items.map((chart) => (
              <ChartCard key={chart.id} chart={chart} />
            ))}
          </div>
          {data.total > data.pageSize && (
            <div className="pagination">
              <button
                className="button secondary"
                disabled={page <= 1}
                onClick={() => update({ page: String(page - 1) })}
              >
                上一页
              </button>
              <span>
                第 {page} / {Math.ceil(data.total / data.pageSize)} 页
              </span>
              <button
                className="button secondary"
                disabled={page * data.pageSize >= data.total}
                onClick={() => update({ page: String(page + 1) })}
              >
                下一页
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="empty">
          <Disc3 size={42} />
          <h2>{q || course ? '还没有找到对应谱面' : '第一份节拍，等你来发布'}</h2>
          <p>
            {q || course
              ? '换一个关键词或难度再试试。'
              : '选择一份 TJA 和它引用的 OGG 或 MP3，开始你的投稿。'}
          </p>
          <Link to="/upload" className="button secondary">
            发布谱面
            <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </>
  )
}
function FolderIcon() {
  return <FileMusic size={42} />
}
export function Auth({ register = false }: { register?: boolean }) {
  const [params] = useSearchParams()
  const session = useSession()
  const destination = params.get('returnTo') || '/upload'
  return (
    <div className="auth-wrap">
      <div className="eyebrow">OURTAIKO ACCOUNT</div>
      <h1>{register ? '加入这段节奏。' : '欢迎回来。'}</h1>
      <p className="muted">一个 OurTaiko 账号，连接你的作品与游玩记录。</p>
      <section className="panel auth-form" aria-label="账号中心登录">
        <UserRound size={32} aria-hidden="true" />
        <h2>{register ? '在账号中心创建账号' : '使用 OurTaiko 账号登录'}</h2>
        <p>登录、昵称和密码由账号中心统一管理。完成登录后会自动返回这里。</p>
        {params.has('error') && <Notice>登录未完成或授权已过期，请重新登录。</Notice>}
        {session.error && <Notice>{session.error}</Notice>}
        <a
          className="button primary full"
          href={`/api/v1/auth/sso/login?returnTo=${encodeURIComponent(destination)}`}
        >
          前往账号中心登录 <ArrowRight size={17} />
        </a>
        <a
          className="button secondary full"
          href="/api/v1/auth/account/register"
          target="_blank"
          rel="noopener noreferrer"
        >
          创建 OurTaiko 账号
        </a>
        <p className="muted">注册会在新标签页打开。完成后回到此页登录。</p>
        {session.user && (
          <Link className="button secondary" to="/upload">
            已登录，继续发布谱面
          </Link>
        )}
      </section>
    </div>
  )
}
export function Detail() {
  const { notify } = useNotification()
  const { id } = useParams(),
    session = useSession(),
    navigate = useNavigate()
  const [chart, setChart] = useState<Chart | null>(null),
    [error, setError] = useState(''),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    setChart(null)
    setError('')
    setEditing(false)
    setSaved(false)
    api<Chart>(`/charts/${id}`, { signal: controller.signal })
      .then(setChart)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message)
      })
    return () => controller.abort()
  }, [id])
  const remove = async () => {
    setError('')
    setBusy(true)
    try {
      await api(`/charts/${id}`, jsonRequest('DELETE', {}, session.csrfToken))
      setConfirm(false)
      navigate('/me/charts')
      notify('作品已删除。', 'success')
    } catch (e) {
      setConfirm(false)
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  if (!chart)
    return (
      <>
        {error ? <Notice>{error}</Notice> : <p className="muted">正在加载谱面…</p>}
        <Link className="back-link" to="/">
          返回谱面列表
        </Link>
      </>
    )
  if (!supportsChart(chart.difficulties)) return <Notice>该谱面类型不受支持。</Notice>
  return (
    <>
      <Link className="back-link" to="/">
        <ArrowLeft size={16} />
        全部谱面
      </Link>
      <div className="detail-hero">
        <Cover chart={chart} large />
        <div className="detail-intro">
          <div className="eyebrow">FANMADE CHART</div>
          <h1>{chart.title}</h1>
          <p className="subtitle">{chart.subtitle.replace(/^(--|\+\+)/, '')}</p>
          <CategoryLabels ids={chart.categoryIds} />
          <div className="detail-facts">
            <span>
              <Music2 size={17} />
              {chart.bpm} BPM
            </span>
            <span>
              <Clock3 size={17} />
              {Math.floor(chart.duration / 60)}:
              {String(Math.floor(chart.duration % 60)).padStart(2, '0')}
            </span>
            <span>
              <UserRound size={17} />
              {chart.maker || chart.uploader}
            </span>
          </div>
          <DifficultyBadges difficulties={chart.difficulties} />
          <div className="detail-actions">
            <a className="button primary" href={resource(chart, 'download')}>
              <Download size={17} />
              下载谱面包
            </a>
            <a className="button secondary" href={resource(chart, 'tja')}>
              TJA 原文件
            </a>
            {session.user && (session.user.id === chart.ownerId || session.user.isAdmin) && (
              <Link className="button secondary" to={`/charts/${chart.id}/update`}>
                更新歌曲与谱面
              </Link>
            )}
            {session.user && (session.user.id === chart.ownerId || session.user.isAdmin) && (
              <button
                className="button secondary"
                onClick={() => {
                  setSaved(false)
                  setEditing(true)
                }}
              >
                <Pencil size={16} />
                编辑信息
              </button>
            )}
          </div>
        </div>
      </div>
      {error && <Notice>{error}</Notice>}
      {saved && <Notice kind="success">谱面信息已保存。</Notice>}
      {editing && session.user && (session.user.id === chart.ownerId || session.user.isAdmin) && (
        <EditMetadata
          key={chart.id}
          chart={chart}
          csrf={session.csrfToken}
          onDismiss={() => setEditing(false)}
          onSaved={(updated) => {
            setChart(updated)
            setEditing(false)
            setSaved(true)
          }}
        />
      )}
      <ChartActivity key={`${chart.id}:${chart.versionId}`} chart={chart} />
      <div className="detail-columns">
        <section className="panel">
          <div className="panel-heading">
            <h2>听听这段节奏</h2>
            <span className="muted">
              {chart.audioName.toLowerCase().endsWith('.mp3') ? 'MP3' : 'OGG / Vorbis'}
            </span>
          </div>
          <audio
            aria-label="音频试听"
            controls
            preload="metadata"
            src={resource(chart, 'audio')}
            onLoadedMetadata={(e) => {
              const a = e.currentTarget
              a.currentTime = Math.max(0, Math.min(chart.demoStart, a.duration - 1))
            }}
          />
          <h2 className="section-spacer">关于这份谱面</h2>
          <p className="description">{chart.description || '上传者还没有填写说明。'}</p>
          <h2 className="section-spacer">难度一览</h2>
          <DifficultyBadges difficulties={chart.difficulties} detailed />
        </section>
        <aside className="panel">
          <h2>投稿信息</h2>
          <dl className="metadata">
            <dt>上传者</dt>
            <dd>{chart.uploader}</dd>
            <dt>发布时间</dt>
            <dd>{new Date(chart.createdAt).toLocaleDateString('zh-CN')}</dd>
            <dt>谱面文件</dt>
            <dd>{chart.tjaName}</dd>
            <dt>音频文件</dt>
            <dd>{chart.wave}</dd>
            <dt>音频大小</dt>
            <dd>{(chart.audioSize / 1024 / 1024).toFixed(1)} MiB</dd>
            <dt>文本编码</dt>
            <dd>{chart.encoding.toUpperCase()}</dd>
          </dl>
          {session.user?.id === chart.ownerId && (
            <div className="delete-area">
              <button className="button ghost danger-text" onClick={() => setConfirm(true)}>
                <Trash2 size={15} />
                删除作品
              </button>
              {confirm && (
                <Modal
                  title="删除作品？"
                  busy={busy}
                  onDismiss={() => setConfirm(false)}
                  actions={
                    <>
                      <button
                        type="button"
                        className="button secondary"
                        disabled={busy}
                        onClick={() => setConfirm(false)}
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        className="button danger"
                        disabled={busy}
                        onClick={remove}
                      >
                        {busy ? '删除中…' : '确认删除'}
                      </button>
                    </>
                  }
                >
                  删除后，作品和下载链接将不再公开。
                </Modal>
              )}
            </div>
          )}
        </aside>
      </div>
    </>
  )
}
