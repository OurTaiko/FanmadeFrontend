import { normalizeLanguage } from './i18n'

type LocalizedChart = {
  title: string
  subtitle: string
  titleTranslations?: Partial<Record<'zh' | 'ja' | 'ko', string>>
  subtitleTranslations?: Partial<Record<'zh' | 'ja' | 'ko', string>>
}

/** The TJA base fields represent English/original metadata, never a UI default. */
export function chartText(chart: LocalizedChart, language?: string | null) {
  const normalized = normalizeLanguage(language)
  const key = normalized === 'zh-Hans' ? 'zh' : normalized
  const select = (field: 'title' | 'subtitle') => {
    const translations = field === 'title' ? chart.titleTranslations : chart.subtitleTranslations
    const preferred = key === 'en' ? chart[field] : translations?.[key]
    return [preferred, chart[field]].find((value) => value?.trim()) ?? ''
  }
  return { title: select('title'), subtitle: select('subtitle').replace(/^(--|\+\+)/, '') }
}
