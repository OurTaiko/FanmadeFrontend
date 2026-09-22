import { Link } from 'react-router-dom'
import { useState } from 'react'
import type { Chart } from '@/api/types'
import { coverSource } from '@/cover'
import { CategoryLabels } from '@/categories'
import { supportsChart } from '@/courses'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { DifficultyBadges } from '@/components/difficulty-badges'

export function ChartCard({ chart }: { chart: Chart }) {
  const [failedSource, setFailedSource] = useState('')
  const source = coverSource(chart)
  const hasCover = !!source && failedSource !== source
  if (!supportsChart(chart.difficulties)) return null
  return (
    <Link
      className="group block rounded-2xl outline-none focus-visible:ring-[#0071e3] focus-visible:ring-2 focus-visible:ring-offset-4 min-w-0 motion-reduce:transform-none active:scale-[0.98] transition-transform motion-reduce:transition-none duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] chart-information"
      data-testid="chart-card"
      to={`/charts/${chart.id}`}
    >
      <Card
        size="sm"
        className="isolate relative bg-white dark:bg-card shadow-[0_4px_12px_rgba(0,0,0,0.08)] py-6 rounded-2xl ring-0 h-full"
      >
        {hasCover && (
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
            <img
              src={source}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-full object-cover motion-reduce:transform-none group-hover:scale-105 transition-transform motion-reduce:transition-none duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
              onError={() => setFailedSource(source)}
            />
            <div className="absolute inset-0 bg-white/80 dark:bg-black/75" />
          </div>
        )}
        <CardContent className="relative flex gap-4 pr-0 pl-6 h-full">
          <div className="flex flex-col flex-1 gap-5 min-w-0">
            <div className="space-y-0.5 min-w-0">
              <h3 className="font-semibold text-lg truncate tracking-tight" title={chart.title}>
                {chart.title}
              </h3>
              <p
                className="text-muted-foreground text-sm truncate"
                title={chart.subtitle.replace(/^(--|\+\+)/, '')}
              >
                {chart.subtitle.replace(/^(--|\+\+)/, '')}
              </p>
            </div>
            <CategoryLabels ids={chart.categoryIds}>
              <li className="min-w-0 max-w-full">
                <Badge
                  variant="outline"
                  className="gap-0 p-0 min-w-0 max-w-full"
                  title={`谱师：${chart.maker || chart.uploader}`}
                >
                  <span className="flex items-center bg-muted px-2 border-r h-full text-muted-foreground shrink-0">
                    谱师
                  </span>
                  <span className="px-2 truncate">{chart.maker || chart.uploader}</span>
                </Badge>
              </li>
              <li>
                <Badge variant="outline" className="tabular-nums">
                  {chart.bpm} BPM
                </Badge>
              </li>
            </CategoryLabels>
          </div>
          <DifficultyBadges difficulties={chart.difficulties} bookmarks />
        </CardContent>
      </Card>
    </Link>
  )
}
