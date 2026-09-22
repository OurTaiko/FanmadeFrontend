import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChoiceSelect } from '@/components/choice-select'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
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
  ArrowCounterClockwiseIcon as RotateCcw,
} from '@phosphor-icons/react'
import { api, resource } from './api'
import type { Chart, Leaderboard } from './api'
import { courseNames, Notice } from './components'
import { defaultDifficulty } from './chart-difficulty'
import { useSession } from './session-context'
import { maxTja } from './tja'
import { isSupportedCourse } from './courses'

const ChartPreview = lazy(() => import('./chart-preview'))

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
        const response = await fetch(resource({ id, versionId }, 'tja'), {
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
    <Card
      className="min-w-0 border p-5 shadow-none ring-0 sm:p-6 gap-5"
      aria-label="谱面预览与排行榜"
      data-testid="chart-activity"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">谱面与成绩</h2>
        </div>
        <Label className="flex flex-wrap items-center gap-3 text-sm">
          难度
          <ChoiceSelect
            label="选择难度"
            value={course}
            onValueChange={setCourse}
            items={courses.map((value) => {
              const difficulty =
                chart.difficulties.find((d) => d.course === value && d.cloudScoreEligible) ??
                chart.difficulties.find((d) => d.course === value)!
              return {
                value,
                label: `${courseNames[value] ?? value} · ${value} ★${difficulty.level}`,
              }
            })}
          />
        </Label>
      </div>
      <dl
        data-testid="difficulty-makers"
        className="flex flex-wrap gap-6 text-sm [&>div]:flex [&>div]:gap-2 [&_dt]:text-muted-foreground"
        aria-live="polite"
      >
        {chart.difficulties
          .filter((d) => d.course === course)
          .map((d) => (
            <div key={d.blockIndex}>
              <dt>
                {isSupportedCourse(d.course) ? courseNames[d.course] : d.course}
                {d.player ? ` ${d.player}` : ''} 谱师
              </dt>
              <dd>{d.maker || '未填写'}</dd>
            </div>
          ))}
      </dl>
      <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
        <TabsList aria-label="歌曲详情内容">
          <TabsTrigger value="preview">
            <FileMusic size={18} />
            谱面预览
          </TabsTrigger>
          <TabsTrigger value="leaderboard">
            <Trophy size={18} />
            排行榜
          </TabsTrigger>
        </TabsList>
        <TabsContent value="preview" className="pt-4">
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
        <TabsContent value="leaderboard" className="pt-4">
          {tab === 'leaderboard' && <ChartLeaderboard key={course} chart={chart} course={course} />}
        </TabsContent>
      </Tabs>
    </Card>
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
    const query = new URLSearchParams({ difficulty: course, versionId, page: String(page) })
    api<Leaderboard>(`/charts/${id}/leaderboard?${query}`, { signal: controller.signal })
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
