import { AudioPlayer } from '@/components/audio-player'
import { ChoiceSelect } from '@/components/choice-select'
import { buttonVariants, Button } from '@/components/ui/button'
import { SearchInput } from '@/components/search-input'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeftIcon as ArrowLeft,
  ArrowRightIcon as ArrowRight,
  DownloadSimpleIcon as Download,
  SlidersHorizontalIcon as SlidersHorizontal,
  TrashIcon as Trash2,
  UploadSimpleIcon as Upload,
  MusicNoteIcon as Music2,
  ClockIcon as Clock3,
  UserIcon as UserRound,
  PencilSimpleIcon as Pencil,
} from '@phosphor-icons/react'
import { api, jsonRequest, resource } from './api'
import type { Chart, ChartList } from './api'
import { ChartCard, DifficultyBadges, Notice, courseNames } from './components'
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
  const [searchPending, setSearchPending] = useState(false)
  const search = useCallback(
    (query: string) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          if (query) next.set('q', query)
          else next.delete('q')
          next.set('page', '1')
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )
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
      <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed px-6 py-16 text-center [&>p]:max-w-lg [&>p]:text-muted-foreground">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">你的作品，从这里开始</h1>
        <p>{authLoading ? '正在读取账号…' : '登录后查看并管理你发布的谱面。'}</p>
        {!authLoading && (
          <Link className={buttonVariants({ variant: 'default', size: 'default' })} to="/login">
            前往登录
            <ArrowRight size={16} />
          </Link>
        )}
      </div>
    )
  const update = (value: Record<string, string>) => setParams({ q, course, page: '1', ...value })
  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center [&_p]:mt-2 [&_p]:text-sm [&_p]:text-muted-foreground">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {mine ? '我的作品' : '发现好谱。'}
          </h1>
          <p>
            {mine ? '管理你的投稿，把下一份灵感变成节拍。' : '寻找喜欢的节奏，听见谱师的灵感。'}
          </p>
        </div>
        <Link className={buttonVariants({ variant: 'default', size: 'default' })} to="/upload">
          <Upload size={17} />
          发布谱面
        </Link>
      </div>
      <div
        role="search"
        aria-label="搜索和筛选谱面"
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <SearchInput
          key={mine ? 'mine' : 'all'}
          value={q}
          onSearch={search}
          onPendingChange={setSearchPending}
        />
        <ChoiceSelect
          label="筛选难度"
          prefix={
            <SlidersHorizontal
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          }
          value={course}
          onValueChange={(value) => update({ course: value })}
          items={[
            { value: '', label: '全部难度' },
            ...Object.entries(courseNames).map(([value, label]) => ({ value, label })),
          ]}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 [&_h2]:flex [&_h2]:items-center [&_h2]:gap-2 [&_h2_span]:text-muted-foreground">
        <h2 className="text-base font-semibold">
          {q ? `“${q}” 的搜索结果` : '最新发布'}
          {!searchPending && !loading && !error && data && <span>{data.total}</span>}
        </h2>
        <span className="text-sm text-muted-foreground">按发布时间排序</span>
      </div>
      {error ? (
        <Notice>{error}</Notice>
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="正在加载谱面">
          {[0, 1, 2].map((n) => (
            <Skeleton className="h-48 rounded-4xl" key={n} />
          ))}
        </div>
      ) : data?.items.length ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.items.map((chart) => (
              <ChartCard key={chart.id} chart={chart} />
            ))}
          </div>
          {data.total > data.pageSize && (
            <div className="flex flex-wrap items-center justify-center gap-4 py-4 text-sm">
              <Button
                variant="outline"
                size="default"
                disabled={page <= 1}
                onClick={() => update({ page: String(page - 1) })}
              >
                上一页
              </Button>
              <span>
                第 {page} / {Math.ceil(data.total / data.pageSize)} 页
              </span>
              <Button
                variant="outline"
                size="default"
                disabled={page * data.pageSize >= data.total}
                onClick={() => update({ page: String(page + 1) })}
              >
                下一页
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed px-6 py-16 text-center [&>p]:max-w-lg [&>p]:text-muted-foreground">
          <h2 className="text-base font-semibold">
            {q || course ? '还没有找到对应谱面' : '第一份节拍，等你来发布'}
          </h2>
          <p>
            {q || course
              ? '换一个关键词或难度再试试。'
              : '选择一份 TJA 和它引用的 OGG 或 MP3，开始你的投稿。'}
          </p>
          <Link to="/upload" className={buttonVariants({ variant: 'outline', size: 'default' })}>
            发布谱面
            <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </>
  )
}

export function Auth({ register = false }: { register?: boolean }) {
  const [params] = useSearchParams()
  const session = useSession()
  const destination = params.get('returnTo') || '/upload'
  return (
    <div className="mx-auto max-w-lg space-y-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {register ? '加入这段节奏。' : '欢迎回来。'}
      </h1>
      <p className="text-sm text-muted-foreground">一个 OurTaiko 账号，连接你的作品与游玩记录。</p>
      <Card
        className="min-w-0 border p-5 shadow-none ring-0 sm:p-6 gap-4 p-6 [&>p]:text-muted-foreground"
        aria-label="账号中心登录"
      >
        <h2 className="text-base font-semibold">
          {register ? '在账号中心创建账号' : '使用 OurTaiko 账号登录'}
        </h2>
        <p>登录、昵称和密码由账号中心统一管理。完成登录后会自动返回这里。</p>
        {params.has('error') && <Notice>登录未完成或授权已过期，请重新登录。</Notice>}
        {session.error && <Notice>{session.error}</Notice>}
        <a
          className={buttonVariants({ variant: 'default', size: 'default', className: 'w-full' })}
          href={`/api/v1/auth/sso/login?returnTo=${encodeURIComponent(destination)}`}
        >
          前往账号中心登录 <ArrowRight size={17} />
        </a>
        <a
          className={buttonVariants({ variant: 'outline', size: 'default', className: 'w-full' })}
          href="/api/v1/auth/account/register"
          target="_blank"
          rel="noopener noreferrer"
        >
          创建 OurTaiko 账号
        </a>
        <p className="text-sm text-muted-foreground">注册会在新标签页打开。完成后回到此页登录。</p>
        {session.user && (
          <Link className={buttonVariants({ variant: 'outline', size: 'default' })} to="/upload">
            已登录，继续发布谱面
          </Link>
        )}
      </Card>
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
        {error ? (
          <Notice>{error}</Notice>
        ) : (
          <p className="text-sm text-muted-foreground">正在加载谱面…</p>
        )}
        <Link
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          to="/"
        >
          返回谱面列表
        </Link>
      </>
    )
  if (!supportsChart(chart.difficulties)) return <Notice>该谱面类型不受支持。</Notice>
  return (
    <>
      <Link
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        to="/"
      >
        <ArrowLeft size={16} />
        全部谱面
      </Link>
      <div className="py-2">
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{chart.title}</h1>
          <p className="text-lg text-muted-foreground">
            {chart.subtitle.replace(/^(--|\+\+)/, '')}
          </p>
          <CategoryLabels ids={chart.categoryIds} />
          <div
            data-testid="detail-facts"
            className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground [&>span]:inline-flex [&>span]:items-center [&>span]:gap-2"
          >
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
          <div className="flex flex-wrap gap-2">
            <a
              className={buttonVariants({ variant: 'default', size: 'default' })}
              href={resource(chart, 'download')}
            >
              <Download size={17} />
              下载谱面包
            </a>
            <a
              className={buttonVariants({ variant: 'outline', size: 'default' })}
              href={resource(chart, 'tja')}
            >
              TJA 原文件
            </a>
            {session.user && (session.user.id === chart.ownerId || session.user.isAdmin) && (
              <Link
                className={buttonVariants({ variant: 'outline', size: 'default' })}
                to={`/charts/${chart.id}/update`}
              >
                更新歌曲与谱面
              </Link>
            )}
            {session.user && (session.user.id === chart.ownerId || session.user.isAdmin) && (
              <Button
                variant="outline"
                size="default"
                onClick={() => {
                  setSaved(false)
                  setEditing(true)
                }}
              >
                <Pencil size={16} />
                编辑信息
              </Button>
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
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="min-w-0 border p-5 shadow-none ring-0 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold">听听这段节奏</h2>
            <span className="text-sm text-muted-foreground">
              {chart.audioName.toLowerCase().endsWith('.mp3') ? 'MP3' : 'OGG / Vorbis'}
            </span>
          </div>
          <AudioPlayer label="音频试听" src={resource(chart, 'audio')} startAt={chart.demoStart} />
          <h2 className="mt-6 text-base font-semibold">关于这份谱面</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed wrap-anywhere">
            {chart.description || '上传者还没有填写说明。'}
          </p>
          <h2 className="mt-6 text-base font-semibold">难度一览</h2>
          <DifficultyBadges difficulties={chart.difficulties} detailed />
        </Card>
        <Card className="min-w-0 border p-5 shadow-none ring-0 sm:p-6">
          <h2 className="text-base font-semibold">投稿信息</h2>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm [&>dt]:text-muted-foreground [&>dd]:wrap-anywhere">
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
            <div className="border-t pt-4">
              <Button
                variant="ghost"
                size="default"
                className="text-destructive"
                onClick={() => setConfirm(true)}
              >
                <Trash2 size={15} />
                删除作品
              </Button>
              {confirm && (
                <Modal
                  title="删除作品？"
                  busy={busy}
                  onDismiss={() => setConfirm(false)}
                  actions={
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="default"
                        disabled={busy}
                        onClick={() => setConfirm(false)}
                      >
                        取消
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="default"
                        disabled={busy}
                        onClick={remove}
                      >
                        {busy ? '删除中…' : '确认删除'}
                      </Button>
                    </>
                  }
                >
                  删除后，作品和下载链接将不再公开。
                </Modal>
              )}
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
