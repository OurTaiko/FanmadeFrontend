import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { FileMusic, Trophy, RotateCcw } from 'lucide-react'
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
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
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

  const selectTab = (event: KeyboardEvent, index: number) => {
    let next: number
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') next = 1 - index
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = 1
    else return
    event.preventDefault()
    setTab(next === 0 ? 'preview' : 'leaderboard')
    tabRefs.current[next]?.focus()
  }

  return (
    <section className="panel chart-activity" aria-label="谱面预览与排行榜">
      <div className="activity-heading">
        <div>
          <div className="eyebrow">EXPLORE THE CHART</div>
          <h2>谱面与成绩</h2>
        </div>
        <label className="course-select">
          难度
          <select aria-label="选择难度" value={course} onChange={(e) => setCourse(e.target.value)}>
            {courses.map((value) => {
              const difficulty =
                chart.difficulties.find((d) => d.course === value && d.cloudScoreEligible) ??
                chart.difficulties.find((d) => d.course === value)!
              return (
                <option key={value} value={value}>
                  {courseNames[value] ?? value} · {value} ★{difficulty.level}
                </option>
              )
            })}
          </select>
        </label>
      </div>
      <dl className="difficulty-makers" aria-live="polite">
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
      <div className="activity-tabs" role="tablist" aria-label="歌曲详情内容">
        {(['preview', 'leaderboard'] as const).map((value, index) => (
          <button
            key={value}
            ref={(node) => {
              tabRefs.current[index] = node
            }}
            type="button"
            role="tab"
            id={`${value}-tab`}
            aria-controls={`${value}-panel`}
            aria-selected={tab === value}
            tabIndex={tab === value ? 0 : -1}
            onClick={() => setTab(value)}
            onKeyDown={(event) => selectTab(event, index)}
          >
            {value === 'preview' ? <FileMusic size={18} /> : <Trophy size={18} />}
            {value === 'preview' ? '谱面预览' : '排行榜'}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="preview-panel"
        aria-labelledby="preview-tab"
        hidden={tab !== 'preview'}
      >
        {tab === 'preview' &&
          (error ? (
            <div className="activity-state">
              <Notice>{error}</Notice>
              <button className="button secondary" onClick={() => setAttempt((n) => n + 1)}>
                <RotateCcw size={16} />
                重新加载
              </button>
            </div>
          ) : !source ? (
            <p className="activity-state muted" role="status">
              正在从服务器读取 TJA…
            </p>
          ) : (
            <Suspense
              fallback={
                <p className="activity-state muted" role="status">
                  正在加载谱面预览…
                </p>
              }
            >
              <ChartPreview key={course} chart={chart} source={source} course={course} />
            </Suspense>
          ))}
      </div>
      <div
        role="tabpanel"
        id="leaderboard-panel"
        aria-labelledby="leaderboard-tab"
        hidden={tab !== 'leaderboard'}
      >
        {tab === 'leaderboard' && <ChartLeaderboard key={course} chart={chart} course={course} />}
      </div>
    </section>
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
      <div className="activity-state">
        <Notice>{error}</Notice>
        <button className="button secondary" onClick={() => setAttempt((n) => n + 1)}>
          重试
        </button>
      </div>
    )
  if (!data)
    return (
      <p className="activity-state muted" role="status">
        正在加载排行榜…
      </p>
    )
  if (!data.supported)
    return (
      <div className="activity-state">
        <Trophy size={30} />
        <Notice kind="info" title="此难度为 DOUBLE 谱面">
          双人谱面不记录云端成绩，暂无排行榜。
        </Notice>
      </div>
    )
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize))
  return (
    <div className="leaderboard">
      <div className="leaderboard-summary">
        <strong>{data.total} 位玩家</strong>
        <span>当前版本 · 单人最高分 · 同分并列</span>
      </div>
      {data.items.length === 0 ? (
        <div className="activity-state">
          <Trophy size={30} />
          <h3>{data.total ? '这一页没有成绩' : '还没有人上榜'}</h3>
          <p className="muted">游玩此难度并提交成绩后，就能在这里看到排名。</p>
        </div>
      ) : (
        <div className="leaderboard-scroll" tabIndex={0} role="region" aria-label="成绩排名表格">
          <table>
            <caption className="sr-only">
              {isSupportedCourse(course) ? courseNames[course] : course} 难度排行榜
            </caption>
            <thead>
              <tr>
                {['排名', '玩家', '总分', '良', '可', '不可', '连打', '提交时间'].map((label) => (
                  <th scope="col" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((entry) => (
                <tr key={entry.id} className={entry.userId === user?.id ? 'is-me' : ''}>
                  <td>
                    <span className={`rank ${entry.rank <= 3 ? 'rank-top' : ''}`}>
                      #{entry.rank}
                    </span>
                  </td>
                  <th scope="row">
                    {entry.username}
                    {entry.userId === user?.id && <span className="me-label">你</span>}
                  </th>
                  <td className="score-value">{entry.score.toLocaleString('zh-CN')}</td>
                  <td>{entry.good.toLocaleString('zh-CN')}</td>
                  <td>{entry.ok.toLocaleString('zh-CN')}</td>
                  <td>{entry.bad.toLocaleString('zh-CN')}</td>
                  <td>{entry.drumroll.toLocaleString('zh-CN')}</td>
                  <td>
                    <time dateTime={entry.submittedAt}>
                      {new Date(entry.submittedAt).toLocaleString('zh-CN')}
                    </time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <div className="leaderboard-pagination">
          <button
            className="button secondary"
            disabled={page <= 1}
            onClick={() => setPage((n) => n - 1)}
          >
            上一页
          </button>
          <span>
            第 {page} / {pages} 页
          </span>
          <button
            className="button secondary"
            disabled={page >= pages || page >= 10000}
            onClick={() => setPage((n) => n + 1)}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}
