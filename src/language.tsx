import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { i18n, normalizeLanguage, formatLocale } from './i18n'
import { useSession } from './session-context'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useSession()
  const language = normalizeLanguage(user?.preferredLanguage)
  useEffect(() => {
    void i18n.changeLanguage(language)
  }, [language])
  return children
}

export function DocumentLanguage() {
  const { t, i18n: instance } = useTranslation()
  useEffect(() => {
    document.documentElement.lang = formatLocale(instance.resolvedLanguage)
    document.title = t('common.siteTitle')
  }, [instance.resolvedLanguage, t])
  return null
}
