import { endpoints } from '@/api/endpoints'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableCaption,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { lazy, Suspense, useEffect, useState } from 'react'
import {
  FileAudioIcon as FileMusic,
  TrophyIcon as Trophy,
  StarIcon,
  ArrowCounterClockwiseIcon as RotateCcw,
} from '@phosphor-icons/react'
import { api } from './api/client'
import type { Chart, Leaderboard } from './api/types'
import { courseNames, isSupportedCourse } from './courses'
import { Notice } from './notifications'
import { defaultDifficulty } from './chart-difficulty'
import { useSession } from './session-context'
import { maxTja } from './tja'

const ChartPreview = lazy(() => import('./chart-preview'))

const difficultyTabColors = {
  Easy: '[--difficulty-bg:var(--color-orange-100)] [--difficulty-fg:var(--color-orange-800)] dark:[--difficulty-bg:#493128] dark:[--difficulty-fg:#f7bb78]',
  Normal:
    '[--difficulty-bg:var(--color-green-100)] [--difficulty-fg:var(--color-green-800)] dark:[--difficulty-bg:#263e32] dark:[--difficulty-fg:#93d5a6]',
  Hard: '[--difficulty-bg:var(--color-yellow-100)] [--difficulty-fg:var(--color-yellow-800)] dark:[--difficulty-bg:#393a21] dark:[--difficulty-fg:#d7d887]',
  Oni: '[--difficulty-bg:var(--color-purple-100)] [--difficulty-fg:var(--color-purple-800)] dark:[--difficulty-bg:#3f2948] dark:[--difficulty-fg:#deb0ed]',
  Edit: '[--difficulty-bg:var(--color-rose-100)] [--difficulty-fg:var(--color-rose-800)] dark:[--difficulty-bg:#462733] dark:[--difficulty-fg:#f19aae]',
}

const tabButtonGroupClassName =
  'shrink-0 gap-0 overflow-hidden rounded-full border border-border bg-transparent p-0'
const tabButtonClassName =
  'h-full rounded-none px-3 text-muted-foreground shadow-none not-first:border-l! not-first:border-l-border! hover:bg-muted/50 focus-visible:z-10 focus-visible:-ring-offset-2 data-active:bg-muted data-active:text-foreground dark:hover:bg-muted/50 dark:data-active:bg-muted after:hidden'
const difficultyTabClassName =
  'bg-transparent text-[color-mix(in_oklab,var(--difficulty-fg)_65%,transparent)] hover:bg-transparent hover:text-[var(--difficulty-fg)] focus-visible:ring-[var(--difficulty-fg)] data-active:hover:bg-[var(--difficulty-bg)] data-active:bg-[var(--difficulty-bg)] data-active:text-[var(--difficulty-fg)] dark:bg-transparent dark:text-[color-mix(in_oklab,var(--difficulty-fg)_65%,transparent)] dark:hover:bg-transparent dark:hover:text-[var(--difficulty-fg)] dark:data-active:hover:bg-[var(--difficulty-bg)] dark:data-active:bg-[var(--difficulty-bg)] dark:data-active:text-[var(--difficulty-fg)]'

export function ChartActivity({ chart }: { chart: Chart }) {
  const [course, setCourse] = useState(() => defaultDifficulty(chart.difficulties))
  const [tab, setTab] = useState<'preview' | 'leaderboard'>('preview')
  const [source, setSource] = useState('')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const courses = [...new Set(chart.difficulties.map((d) => d.course).filter(isSupportedCourse))]
  const { id, versionId, encoding } = chart

  useEffect(() => {
    const controller = new AbortController()
    setSource('')
    setError('')
    async function load() {
      try {
        const response = await fetch(endpoints.resource({ id, versionId }, 'tja'), {
          signal: controller.signal,
          credentials: 'include',
        })
        if (!response.ok) throw new Error(`谱面文件读取失败（HTTP ${response.status}）`)
        if (Number(response.headers.get('Content-Length')) > maxTja)
          throw new Error('谱面超过预览大小限制')
        const bytes = await response.arrayBuffer()
        if (bytes.byteLength > maxTja) throw new Error('谱面超过预览大小限制')
        const text = new TextDecoder(encoding, { fatal: true }).decode(bytes)
        if (!controller.signal.aborted) setSource(text)
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : '谱面加载失败')
      }
    }
    void load()
    return () => controller.abort()
  }, [id, versionId, encoding, attempt])

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(value as typeof tab)}
      className="min-w-0 gap-6"
      aria-label="谱面预览与排行榜"
      data-testid="chart-activity"
    >
      <section
        className="flex min-w-0 items-center justify-start gap-3 overflow-x-auto py-1"
        aria-label="谱面内容与难度切换"
      >
        <Tabs
          value={course}
          onValueChange={(value) => setCourse(String(value))}
          className="shrink-0"
        >
          <TabsList aria-label="选择难度" className={tabButtonGroupClassName}>
            {courses.map((value) => {
              const difficulty =
                chart.difficulties.find((d) => d.course === value && d.cloudScoreEligible) ??
                chart.difficulties.find((d) => d.course === value)!
              return (
                <TabsTrigger
                  key={value}
                  value={value}
                  className={`${tabButtonClassName} ${difficultyTabClassName} ${difficultyTabColors[value]}`}
                >
                  {courseNames[value]}
                  <span
                    className="inline-flex items-center gap-1 tabular-nums"
                    aria-label={`${difficulty.level} 星`}
                  >
                    <StarIcon weight="fill" className="size-3" aria-hidden="true" />
                    {difficulty.level}
                  </span>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>
        <Separator orientation="vertical" className="h-6 data-vertical:self-center" />
        <TabsList aria-label="歌曲详情内容" className={tabButtonGroupClassName}>
          <TabsTrigger value="preview" className={tabButtonClassName}>
            <FileMusic size={18} />
            谱面预览
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className={tabButtonClassName}>
            <Trophy size={18} />
            排行榜
          </TabsTrigger>
        </TabsList>
      </section>
      <Card className="min-w-0 border p-5 shadow-none ring-0 sm:p-6">
        <TabsContent value="preview">
          {tab === 'preview' &&
            (error ? (
              <div className="flex min-h-40 flex-col items-center justify-center gap-3 py-6 text-center">
                <Notice>{error}</Notice>
                <Button variant="outline" size="default" onClick={() => setAttempt((n) => n + 1)}>
                  <RotateCcw size={16} />
                  重新加载
                </Button>
              </div>
            ) : !source ? (
              <p
                className="flex min-h-40 flex-col items-center justify-center gap-3 py-6 text-center text-sm text-muted-foreground"
                role="status"
              >
                正在从服务器读取 TJA…
              </p>
            ) : (
              <Suspense
                fallback={
                  <p
                    className="flex min-h-40 flex-col items-center justify-center gap-3 py-6 text-center text-sm text-muted-foreground"
                    role="status"
                  >
                    正在加载谱面预览…
                  </p>
                }
              >
                <ChartPreview key={course} chart={chart} source={source} course={course} />
              </Suspense>
            ))}
        </TabsContent>
        <TabsContent value="leaderboard">
          {tab === 'leaderboard' && <ChartLeaderboard key={course} chart={chart} course={course} />}
        </TabsContent>
      </Card>
    </Tabs>
  )
}

function ChartLeaderboard({ chart, course }: { chart: Chart; course: string }) {
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Leaderboard | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const { user } = useSession()
  const { id, versionId } = chart
  useEffect(() => {
    const controller = new AbortController()
    setData(null)
    setError('')
    api<Leaderboard>(endpoints.leaderboard(id, { difficulty: course, versionId, page }), {
      signal: controller.signal,
    })
      .then((response) => {
        if (!controller.signal.aborted) setData(response)
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message)
      })
    return () => controller.abort()
  }, [id, versionId, course, page, attempt])
  if (error)
    return (
      <div className="flex min-h-40 flex-col items-center justify-center gap-3 py-6 text-center">
        <Notice>{error}</Notice>
        <Button variant="outline" size="default" onClick={() => setAttempt((n) => n + 1)}>
          重试
        </Button>
      </div>
    )
  if (!data)
    return (
      <p
        className="flex min-h-40 flex-col items-center justify-center gap-3 py-6 text-center text-sm text-muted-foreground"
        role="status"
      >
        正在加载排行榜…
      </p>
    )
  if (!data.supported)
    return (
      <div className="flex min-h-40 flex-col items-center justify-center gap-3 py-6 text-center">
        <Notice kind="info" title="此难度为 DOUBLE 谱面">
          双人谱面不记录云端成绩，暂无排行榜。
        </Notice>
      </div>
    )
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize))
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm [&>span]:text-muted-foreground">
        <strong>{data.total} 位玩家</strong>
        <span>当前版本 · 单人最高分 · 同分并列</span>
      </div>
      {data.items.length === 0 ? (
        <div className="flex min-h-40 flex-col items-center justify-center gap-3 py-6 text-center">
          <h3 className="text-base font-medium">
            {data.total ? '这一页没有成绩' : '还没有人上榜'}
          </h3>
          <p className="text-sm text-muted-foreground">
            游玩此难度并提交成绩后，就能在这里看到排名。
          </p>
        </div>
      ) : (
        <div
          className="min-w-0 overflow-x-auto rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
          tabIndex={0}
          role="region"
          aria-label="成绩排名表格"
        >
          <Table>
            <TableCaption className="sr-only">
              {isSupportedCourse(course) ? courseNames[course] : course} 难度排行榜
            </TableCaption>
            <TableHeader>
              <TableRow>
                {['排名', '玩家', '总分', '良', '可', '不可', '连打', '提交时间'].map((label) => (
                  <TableHead scope="col" key={label}>
                    {label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((entry) => (
                <TableRow
                  key={entry.id}
                  className={entry.userId === user?.id ? 'bg-accent/50' : ''}
                >
                  <TableCell>
                    <span className="font-medium tabular-nums">#{entry.rank}</span>
                  </TableCell>
                  <TableHead scope="row">
                    {entry.nickname}
                    {entry.userId === user?.id && (
                      <span className="ml-2 rounded-md bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                        你
                      </span>
                    )}
                  </TableHead>
                  <TableCell className="font-semibold tabular-nums">
                    {entry.score.toLocaleString('zh-CN')}
                  </TableCell>
                  <TableCell>{entry.good.toLocaleString('zh-CN')}</TableCell>
                  <TableCell>{entry.ok.toLocaleString('zh-CN')}</TableCell>
                  <TableCell>{entry.bad.toLocaleString('zh-CN')}</TableCell>
                  <TableCell>{entry.drumroll.toLocaleString('zh-CN')}</TableCell>
                  <TableCell>
                    <time dateTime={entry.submittedAt}>
                      {new Date(entry.submittedAt).toLocaleString('zh-CN')}
                    </time>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {pages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
          <Button
            variant="outline"
            size="default"
            disabled={page <= 1}
            onClick={() => setPage((n) => n - 1)}
          >
            上一页
          </Button>
          <span>
            第 {page} / {pages} 页
          </span>
          <Button
            variant="outline"
            size="default"
            disabled={page >= pages || page >= 10000}
            onClick={() => setPage((n) => n + 1)}
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  )
}
