import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeftIcon, ArrowClockwiseIcon } from '@phosphor-icons/react'
import { api } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import type { UserSpace } from '@/api/types'
import { PublicUserCard } from '@/components/public-user-card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Library } from '@/pages'
import { Card } from '@/components/ui/card'
import { useSession } from '@/session-context'

export function UserSpacePage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const session = useSession()
  const [data, setData] = useState<UserSpace | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    window.scrollTo(0, 0)
    const controller = new AbortController()
    setLoading(true)
    setError('')
    api<UserSpace>(endpoints.user(id), { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setData(result)
      })
      .catch((e: Error) => {
        if (!controller.signal.aborted) setError(e.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [id, refresh])
  const current = data?.user.id === id ? data : null
  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/users"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4 shrink-0" />
          {t('messages.backToUserSquare')}
        </Link>
        {session.user?.id === id && (
          <Link to="/me/profile" className={buttonVariants({ variant: 'outline' })}>
            {t('messages.manageMyAccount')}
          </Link>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="min-w-0 break-words text-3xl font-semibold tracking-tight sm:text-4xl">
          {current && !loading && !error
            ? t('messages.memberSpaceTitle', {
                nickname: current.user.nickname ?? t('messages.unknownMember'),
              })
            : t('messages.userSpace')}
        </h1>
        <Button variant="outline" disabled={loading} onClick={() => setRefresh((n) => n + 1)}>
          <ArrowClockwiseIcon aria-hidden="true" />
          {t('messages.refreshUsers')}
        </Button>
      </div>
      {error ? (
        <Card role="alert" className="rounded-2xl border p-6 text-destructive shadow-none ring-0">
          {error}
        </Card>
      ) : loading || !current ? (
        <div
          className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]"
          role="status"
          aria-label={t('messages.loadingMembers')}
        >
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      ) : (
        <>
          {!current.profilesAvailable && (
            <p role="status" className="text-sm text-muted-foreground">
              {t('messages.memberNamesUnavailable')}
            </p>
          )}
          <div className="grid items-start gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <aside className="min-w-0 space-y-4" aria-label={t('messages.publicMemberDetails')}>
              <PublicUserCard user={current.user} showSpaceLink={false} />
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t('messages.memberActivityNote')}
              </p>
            </aside>
            <section className="min-w-0 space-y-6" aria-label={t('messages.userPublishedCharts')}>
              <h2 className="text-xl font-semibold tracking-tight">
                {t('messages.publicChartCount')}
              </h2>
              <Library key={`${id}:${refresh}`} ownerId={id} embedded />
            </section>
          </div>
        </>
      )}
    </section>
  )
}
