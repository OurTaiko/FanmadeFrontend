import { useTranslation } from 'react-i18next'
import { StarIcon } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import type { Difficulty } from '@/tja'
import { courseNames, isSupportedCourse, baseCourse } from '@/courses'

const difficultyColors = {
  Easy: 'bg-orange-100 text-orange-800 dark:bg-[#493128] dark:text-[#f7bb78]',
  Normal: 'bg-green-100 text-green-800 dark:bg-[#263e32] dark:text-[#93d5a6]',
  Hard: 'bg-yellow-100 text-yellow-800 dark:bg-[#393a21] dark:text-[#d7d887]',
  Oni: 'bg-purple-100 text-purple-800 dark:bg-[#3f2948] dark:text-[#deb0ed]',
  Edit: 'bg-rose-100 text-rose-800 dark:bg-[#462733] dark:text-[#f19aae]',
}

export function DifficultyBadges({
  difficulties,
  detailed = false,
  bookmarks = false,
}: {
  difficulties: Difficulty[]
  detailed?: boolean
  bookmarks?: boolean
}) {
  const { t } = useTranslation()

  const supported = difficulties.filter((d) => isSupportedCourse(d.course))
  const items = detailed
    ? supported
    : supported.filter(
        (d, index, all) => all.findIndex((other) => other.course === d.course) === index,
      )
  if (bookmarks)
    return (
      <ul
        aria-label={t('messages.chartDifficulty')}
        className="flex flex-col self-start gap-2 w-24 shrink-0"
      >
        {items.map((d) => (
          <li
            key={d.course}
            className="flex justify-between items-center gap-1 bg-[#f5f5f7] dark:bg-muted py-2 pr-3 pl-5 min-h-8 font-medium text-[#424245] dark:text-foreground text-xs [clip-path:polygon(0_0,100%_0,100%_100%,0_100%,8px_50%)]"
          >
            <span>{isSupportedCourse(d.course) ? courseNames[d.course] : ''}</span>
            <span
              className="inline-flex items-center gap-0.5 tabular-nums"
              aria-label={t('common.stars', { count: d.level })}
            >
              <StarIcon
                weight="fill"
                className="size-3 text-[#0071e3] dark:text-blue-400 motion-reduce:transform-none group-hover:scale-105 transition-transform motion-reduce:transition-none duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
                aria-hidden="true"
              />
              {d.level}
            </span>
          </li>
        ))}
      </ul>
    )
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((d) => (
        <Badge
          variant="secondary"
          className={
            isSupportedCourse(d.course) ? difficultyColors[baseCourse(d.course)] : undefined
          }
          key={d.course}
        >
          {isSupportedCourse(d.course) ? courseNames[d.course] : ''}
          <span
            className="inline-flex items-center gap-1 tabular-nums"
            aria-label={t('common.stars', { count: d.level })}
          >
            <StarIcon weight="fill" className="size-3" aria-hidden="true" />
            {d.level}
          </span>
        </Badge>
      ))}
    </div>
  )
}
