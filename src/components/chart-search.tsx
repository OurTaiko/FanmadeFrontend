import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CaretDownIcon, SlidersHorizontalIcon } from '@phosphor-icons/react'
import { courseNames } from '@/courses'
import { Button } from '@/components/ui/button'
import { ChoiceSelect } from '@/components/choice-select'
import { SearchInput } from '@/components/search-input'

export function ChartSearch({
  query,
  course,
  level,
  order,
  signedIn,
  onSearch,
  onPendingChange,
  onChange,
}: {
  query: string
  course: string
  level: string
  order: string
  signedIn: boolean
  onSearch: (query: string) => void
  onPendingChange: (pending: boolean) => void
  onChange: (values: Record<string, string>) => void
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const panelId = useId()
  const orders = [
    { value: '', label: t('messages.defaultSearchOrder') },
    { value: 'unfc', label: t('messages.unfcFirst') },
    { value: 'unperfect', label: t('messages.unperfectFirst') },
  ]
  const selected = [
    course ? courseNames[course as keyof typeof courseNames] : '',
    level ? `★ ${level}` : '',
    order ? orders.find((item) => item.value === order)?.label : '',
  ].filter(Boolean)
  return (
    <div role="search" aria-label={t('messages.searchAndFilterCharts')} className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput value={query} onSearch={onSearch} onPendingChange={onPendingChange} />
        <Button
          type="button"
          variant="outline"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((value) => !value)}
          className="shrink-0 active:scale-[0.98]"
        >
          <SlidersHorizontalIcon aria-hidden="true" />
          {t('messages.advancedSearch')}
          {selected.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2 text-primary">{selected.length}</span>
          )}
          <CaretDownIcon
            aria-hidden="true"
            className={`transition-transform duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`}
          />
        </Button>
      </div>
      <div id={panelId} hidden={!expanded} className="rounded-2xl bg-muted/50 p-5 sm:p-6">
        <p className="mb-5 text-sm text-muted-foreground">{t('messages.searchKeywordScope')}</p>
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            {
              label: t('messages.filterDifficulty'),
              value: course,
              key: 'course',
              items: [
                { value: '', label: t('messages.allDifficulties') },
                ...Object.entries(courseNames).map(([value, label]) => ({ value, label })),
              ],
            },
            {
              label: t('messages.filterStars'),
              value: level,
              key: 'level',
              items: [
                { value: '', label: t('messages.allStars') },
                ...Array.from({ length: 10 }, (_, i) => ({
                  value: String(i + 1),
                  label: `★ ${i + 1}`,
                })),
              ],
            },
            { label: t('messages.searchOrder'), value: order, key: 'order', items: orders },
          ].map((field) => (
            <div
              key={field.key}
              className="min-w-0 space-y-2 [&_[data-slot=select-trigger]]:w-full"
            >
              <p className="text-sm font-medium">{field.label}</p>
              <ChoiceSelect
                label={field.label}
                value={field.value}
                items={field.items}
                onValueChange={(value) => onChange({ [field.key]: value })}
              />
            </div>
          ))}
        </div>
        {!signedIn && (
          <p className="mt-4 text-sm text-muted-foreground">{t('messages.guestSearchOrder')}</p>
        )}
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <span className="text-muted-foreground">{t('messages.activeSearchFilters')}</span>
          <span>{selected.join(' · ')}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange({ course: '', level: '', order: '' })}
          >
            {t('messages.resetSearchFilters')}
          </Button>
        </div>
      )}
      {!expanded && !signedIn && order && (
        <p className="text-sm text-muted-foreground">{t('messages.guestSearchOrder')}</p>
      )}
    </div>
  )
}
