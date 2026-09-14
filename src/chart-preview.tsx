import { useEffect, useMemo, useRef, useState } from 'react'
import { GitBranch, MousePointerClick, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import { createChartView, DEFAULT_RENDER_OPTIONS } from '../TJARenderer/src/internal'
import type { RenderOptions } from '../TJARenderer/src/internal'
import type { HitInfo } from '../TJARenderer/src/hit-testing'
import type { BranchName, NoteLocation } from '../TJARenderer/src/primitives'
import type { Chart } from './api'
import { Notice } from './components'
import { parsePreviewTja } from './preview-tja'

const branchLabels = { normal: '普通分支', expert: '玄人分支', master: '达人分支' }
const zoomLevels = [4, 8, 12, 16, 24, 32, 48]
const initialZoom = () => (window.matchMedia('(max-width: 600px)').matches ? 4 : 16)
function sameNote(a: NoteLocation, b: NoteLocation) {
  return a.barIndex === b.barIndex && a.charIndex === b.charIndex && a.branch === b.branch
}
function number(value: number | undefined) {
  return value === undefined || !Number.isFinite(value) ? '—' : Number(value.toFixed(2)).toString()
}

export default function ChartPreview({
  chart,
  source,
  course,
}: {
  chart: Chart
  source: string
  course: string
}) {
  const blocks = chart.difficulties.filter((d) => d.course === course)
  const preferred =
    blocks.find((d) => d.cloudScoreEligible) ?? blocks.find((d) => d.player === 'P1') ?? blocks[0]
  const [blockIndex, setBlockIndex] = useState(preferred?.blockIndex ?? 0)
  const [branch, setBranch] = useState<'all' | BranchName>('all')
  const [zoom, setZoom] = useState(initialZoom)
  const [selected, setSelected] = useState<HitInfo | null>(null)
  const [hovered, setHovered] = useState<HitInfo | null>(null)
  const [renderError, setRenderError] = useState('')
  const [reset, setReset] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const parsed = useMemo(() => {
    try {
      return { blocks: parsePreviewTja(source), error: '' }
    } catch (e) {
      return { blocks: null, error: e instanceof Error ? e.message : 'TJA 解析失败' }
    }
  }, [source])
  const root = parsed.blocks?.[blockIndex]
  const selectedChart = branch === 'all' ? root : (root?.branches?.[branch] ?? root)
  const currentChart = useMemo(
    () =>
      selectedChart
        ? {
            ...selectedChart,
            title: chart.title,
            subtitle: chart.subtitle,
            course,
            level:
              chart.difficulties.find((d) => d.blockIndex === blockIndex)?.level ??
              selectedChart.level,
          }
        : null,
    [selectedChart, chart.title, chart.subtitle, chart.difficulties, course, blockIndex],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    const viewport = viewportRef.current
    if (!canvas || !viewport || !currentChart) return
    setSelected(null)
    setHovered(null)
    setRenderError('')
    const options: RenderOptions = {
      ...DEFAULT_RENDER_OPTIONS,
      beatsPerLine: zoom,
      showAllBranches: branch === 'all' && Boolean(root?.branches),
      showAttribution: true,
      tjaSourceName: 'OurTaiko Fanmade',
      selection: null,
      hoveredNote: null,
    }
    const view = createChartView(currentChart, canvas)
    const render = () => {
      try {
        view.invalidateLayout()
        view.render({ renderOptions: options, dpr: window.devicePixelRatio || 1 })
      } catch (e) {
        setRenderError(e instanceof Error ? e.message : '谱面绘制失败')
      }
    }
    render()
    const removeHover = view.onNoteHovered(({ hit }) => {
      canvas.style.cursor = hit ? 'pointer' : 'default'
      setHovered((previous) =>
        previous && hit && sameNote(previous.location, hit.location) ? previous : hit,
      )
    })
    const removeClick = view.onNoteClicked(({ hit }) => {
      setSelected(hit)
      if (!hit) options.selection = null
      else if (hit.location.charIndex >= 0) {
        const selection = options.selection
        if (!selection || selection.end) options.selection = { start: hit.location, end: null }
        else if (sameNote(selection.start, hit.location)) {
          options.selection = null
          setSelected(null)
        } else options.selection = { start: selection.start, end: hit.location }
      }
      render()
    })
    let frame = 0
    let width = viewport.clientWidth
    const observer = new ResizeObserver(() => {
      const next = viewport.clientWidth
      if (next === width) return
      width = next
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(render)
    })
    observer.observe(viewport)
    return () => {
      removeHover()
      removeClick()
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [currentChart, zoom, branch, root, reset])

  const info = selected ?? hovered
  if (parsed.error || !root)
    return (
      <div className="activity-state">
        <Notice>{parsed.error || '此难度暂无可预览的谱面块'}</Notice>
      </div>
    )
  const zoomIndex = zoomLevels.indexOf(zoom)
  return (
    <div className="chart-preview">
      <div className="preview-toolbar">
        {blocks.length > 1 && (
          <label>
            谱面声部
            <select
              aria-label="谱面声部"
              value={blockIndex}
              onChange={(e) => {
                setBlockIndex(Number(e.target.value))
                setBranch('all')
              }}
            >
              {blocks.map((d) => (
                <option key={d.blockIndex} value={d.blockIndex}>
                  {d.cloudScoreEligible ? '单人谱' : `DOUBLE ${d.player || ''}`} · ★{d.level}
                </option>
              ))}
            </select>
          </label>
        )}
        {root.branches && (
          <label>
            <GitBranch size={16} />
            分支
            <select
              aria-label="选择分支"
              value={branch}
              onChange={(e) => setBranch(e.target.value as typeof branch)}
            >
              <option value="all">全部分支</option>
              {Object.entries(branchLabels)
                .filter(([key]) => root.branches?.[key as BranchName])
                .map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
            </select>
          </label>
        )}
        <div className="preview-zoom">
          <button
            type="button"
            className="button secondary"
            aria-label="放大谱面"
            disabled={zoomIndex === 0}
            onClick={() => setZoom(zoomLevels[zoomIndex - 1])}
          >
            <ZoomIn size={17} />
          </button>
          <label>
            <span className="sr-only">每行拍数</span>
            <select
              aria-label="每行拍数"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            >
              {zoomLevels.map((n) => (
                <option key={n} value={n}>
                  {n} 拍 / 行
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="button secondary"
            aria-label="缩小谱面"
            disabled={zoomIndex === zoomLevels.length - 1}
            onClick={() => setZoom(zoomLevels[zoomIndex + 1])}
          >
            <ZoomOut size={17} />
          </button>
          <button
            type="button"
            className="button ghost"
            onClick={() => {
              setZoom(initialZoom())
              setBranch('all')
              setReset((n) => n + 1)
            }}
          >
            <RotateCcw size={16} />
            重置
          </button>
        </div>
      </div>
      <p className="preview-hint">
        <MousePointerClick size={16} />
        点击音符查看信息，连续点击两个音符可选中区间；点击空白取消。
      </p>
      {renderError && <Notice>{renderError}</Notice>}
      <div
        ref={viewportRef}
        className="preview-canvas-wrap"
        tabIndex={0}
        role="region"
        aria-label="可滚动谱面预览"
      >
        <canvas ref={canvasRef} aria-label={`${course} 难度交互谱面预览`}>
          交互谱面预览，可下载 TJA 原文件查看完整谱面。
        </canvas>
      </div>
      <div className="preview-note-info" role="status" aria-live="polite">
        <div>
          <span>小节 / 音符</span>
          <strong>
            {info ? `${info.location.barIndex + 1} / ${info.ordinal ?? '—'}` : '点击音符查看'}
          </strong>
        </div>
        <div>
          <span>BPM</span>
          <strong>{number(info?.bpm)}</strong>
        </div>
        <div>
          <span>滚动倍率</span>
          <strong>{number(info?.scroll)}</strong>
        </div>
        <div>
          <span>BPM × 倍率</span>
          <strong>
            {number(
              info?.bpm !== undefined && info.scroll !== undefined
                ? info.bpm * info.scroll
                : undefined,
            )}
          </strong>
        </div>
        {root.branches && (
          <div>
            <span>分支</span>
            <strong>{info?.location.branch ? branchLabels[info.location.branch] : '—'}</strong>
          </div>
        )}
      </div>
    </div>
  )
}
