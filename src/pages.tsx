import { formatLocale } from '@/i18n'
import { chartText } from '@/chart-language'
import { i18n } from '@/i18n'
import { useTranslation } from 'react-i18next'
import { endpoints } from '@/api/endpoints'
import { DialogClose } from '@/components/ui/dialog'
import { ChartCover } from '@/components/chart-cover'
import { AudioPlayer } from '@/components/audio-player'
import { buttonVariants, Button } from '@/components/ui/button'
import { ChartSearch } from '@/components/chart-search'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowRightIcon as ArrowRight,
  DownloadSimpleIcon as Download,
  TrashIcon as Trash2,
  UploadSimpleIcon as Upload,
  PencilSimpleIcon as Pencil,
  HeadphonesIcon,
  ArrowSquareOutIcon,
  ClockIcon,
} from '@phosphor-icons/react'
import { api, jsonRequest } from './api/client'
import type { Chart, ChartList } from './api/types'
import { ChartCard } from '@/components/chart-card'
import { DifficultyBadges } from '@/components/difficulty-badges'
import { isSupportedCourse, supportsChart } from './courses'
import { useSession } from './session-context'
import { EditMetadata } from './edit-metadata'
import { ChartActivity } from './chart-activity'
import { Modal, Notice } from './notifications'
import { useNotification } from './notification-context'
import { CategoryLabels } from './categories'

export function Library({
  mine = false,
  ownerId,
  embedded = false,
}: {
  mine?: boolean
  ownerId?: string
  embedded?: boolean
}) {
  const { t } = useTranslation()

  const [params, setParams] = useSearchParams(),
    { user, loading: authLoading } = useSession()
  const [data, setData] = useState<ChartList | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true)
  const [searchPending, setSearchPending] = useState(false)
  const search = useCallback(
    (query: string) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          if (query) next.set('q', query)
          else next.delete('q')
          next.set('page', '1')
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )
  const q = params.get('q') || '',
    course = isSupportedCourse(params.get('course') || '') ? params.get('course')! : '',
    level = /^(?:[1-9]|10)$/.test(params.get('level') || '') ? params.get('level')! : '',
    order = ['unfc', 'unperfect'].includes(params.get('order') || '') ? params.get('order')! : '',
    owner = mine ? '' : ownerId || params.get('owner') || '',
    page = Math.min(10000, Math.max(1, Math.floor(Number(params.get('page')) || 1)))
  useEffect(() => {
    if (mine && !user) return
    const controller = new AbortController()
    setLoading(true)
    setError('')
    api<ChartList>(
      endpoints.chartList({ q, course, level, order, page, ...(owner ? { owner } : {}) }, mine),
      {
        signal: controller.signal,
      },
    )
      .then((result) => {
        if (!controller.signal.aborted) setData(result)
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [mine, user, q, course, level, order, page, owner])
  if (mine && !user)
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed bg-card/60 px-6 py-16 text-center [&>p]:max-w-lg [&>p]:text-muted-foreground">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t('messages.yourCreationsStartHere')}
        </h1>
        <p>
          {authLoading
            ? t('messages.loadingAccount')
            : t('messages.signInToViewAndManageYourCharts')}
        </p>
        {!authLoading && (
          <Link className={buttonVariants({ variant: 'default', size: 'default' })} to="/login">
            {t('messages.signIn')}
            <ArrowRight size={16} />
          </Link>
        )}
      </div>
    )
  const update = (value: Record<string, string>) =>
    setParams((current) => {
      const next = new URLSearchParams(current)
      next.set('page', '1')
      for (const [key, entry] of Object.entries(value)) {
        if (entry) next.set(key, entry)
        else next.delete(key)
      }
      return next
    })
  return (
    <>
      {!embedded && (
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center [&_p]:mt-2 [&_p]:text-sm [&_p]:text-muted-foreground">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {mine
                ? t('messages.myCharts')
                : owner
                  ? t('messages.userPublishedCharts')
                  : t('messages.discoverGreatCharts')}
            </h1>
            <p>
              {mine
                ? t('messages.manageYourChartsAndTurnInspirationIntoRhythm')
                : t('messages.findYourRhythmAndDiscoverChartCreatorsIdeas')}
            </p>
          </div>
          <Link className={buttonVariants({ variant: 'default', size: 'default' })} to="/upload">
            <Upload size={17} />
            {t('messages.publishChart')}
          </Link>
        </div>
      )}
      {owner && !embedded && (
        <Link to="/users" className="text-sm text-primary hover:underline">
          {t('messages.backToUserSquare')}
        </Link>
      )}
      <ChartSearch
        key={mine ? 'mine' : owner || 'all'}
        query={q}
        course={course}
        level={level}
        order={order}
        signedIn={!!user}
        onSearch={search}
        onPendingChange={setSearchPending}
        onChange={update}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 [&_h2]:flex [&_h2]:items-center [&_h2]:gap-2 [&_h2_span]:text-muted-foreground">
        <h2 className="text-base font-semibold">
          {q ? t('messages.searchResults', { query: q }) : t('messages.latestCharts')}
          {!searchPending && !loading && !error && data && <span>{data.total}</span>}
        </h2>
        <span className="text-sm text-muted-foreground">
          {user && order
            ? t(order === 'unfc' ? 'messages.unfcFirst' : 'messages.unperfectFirst')
            : t('messages.sortedByPublishDate')}
        </span>
      </div>
      {error ? (
        <Notice>{error}</Notice>
      ) : loading ? (
        <div
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          aria-label={t('messages.loadingCharts')}
        >
          {[0, 1, 2].map((n) => (
            <Skeleton className="h-48 rounded-4xl" key={n} />
          ))}
        </div>
      ) : data?.items.length ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.items.map((chart) => (
              <ChartCard key={chart.id} chart={chart} />
            ))}
          </div>
          {data.total > data.pageSize && (
            <div className="flex flex-wrap items-center justify-center gap-4 py-4 text-sm">
              <Button
                variant="outline"
                size="default"
                disabled={page <= 1}
                onClick={() => update({ page: String(page - 1) })}
              >
                {t('messages.previous')}
              </Button>
              <span>
                {t('messages.pagination', {
                  page: page,
                  pages: Math.ceil(data.total / data.pageSize),
                })}
              </span>
              <Button
                variant="outline"
                size="default"
                disabled={page * data.pageSize >= data.total}
                onClick={() => update({ page: String(page + 1) })}
              >
                {t('messages.next')}
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed bg-card/60 px-6 py-16 text-center [&>p]:max-w-lg [&>p]:text-muted-foreground">
          <h2 className="text-base font-semibold">
            {q || course || level
              ? t('messages.noMatchingCharts')
              : owner
                ? t('messages.noPublishedChartsYet')
                : t('messages.beTheFirstToShareARhythm')}
          </h2>
          <p>
            {q || course || level
              ? t('messages.tryOtherSearchFilters')
              : owner
                ? t('messages.memberHasNoPublicCharts')
                : t('messages.chooseATjaAndItsOggOrMp3AudioToGetStarted')}
          </p>
          {!owner && (
            <Link to="/upload" className={buttonVariants({ variant: 'outline', size: 'default' })}>
              {t('messages.publishChart')}
              <ArrowRight size={16} />
            </Link>
          )}
        </div>
      )}
    </>
  )
}

export function Auth({ register = false }: { register?: boolean }) {
  const { t } = useTranslation()

  const [params] = useSearchParams()
  const session = useSession()
  const destination = params.get('returnTo') || '/upload'
  return (
    <div className="mx-auto max-w-lg space-y-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {register ? t('messages.joinTheRhythm') : t('messages.welcomeBack')}
      </h1>
      <p className="text-sm text-muted-foreground">
        {t('messages.oneOurtaikoAccountForYourCreationsAndPlayRecords')}
      </p>
      <Card
        className="min-w-0 border p-5 shadow-none ring-0 sm:p-6 gap-4 p-6 [&>p]:text-muted-foreground"
        aria-label={t('messages.accountCenterSignIn')}
      >
        <h2 className="text-base font-semibold">
          {register
            ? t('messages.createAnAccountInTheAccountCenter')
            : t('messages.signInWithOurtaiko')}
        </h2>
        <p>{t('messages.signInNicknameAndPasswordAreManagedInTheAccountCenterYou')}</p>
        {params.has('error') && (
          <Notice>
            {t('messages.signInWasIncompleteOrAuthorizationExpiredPleaseSignInAgain')}
          </Notice>
        )}
        {session.error && <Notice>{session.error}</Notice>}
        <a
          className={buttonVariants({ variant: 'default', size: 'default', className: 'w-full' })}
          href={endpoints.login(destination)}
        >
          {t('messages.goToAccountCenter')}
          <ArrowRight size={17} />
        </a>
        <a
          className={buttonVariants({ variant: 'outline', size: 'default', className: 'w-full' })}
          href={endpoints.accountRegister}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('messages.createAnOurtaikoAccount')}
        </a>
        <p className="text-sm text-muted-foreground">
          {t('messages.registrationOpensInANewTabReturnHereToSignInWhen')}
        </p>
        {session.user && (
          <Link className={buttonVariants({ variant: 'outline', size: 'default' })} to="/upload">
            {t('messages.signedInContinuePublishing')}
          </Link>
        )}
      </Card>
    </div>
  )
}
export function Detail() {
  const { t } = useTranslation()

  const { notify } = useNotification()
  const { id } = useParams(),
    session = useSession(),
    navigate = useNavigate()
  const [chart, setChart] = useState<Chart | null>(null),
    [error, setError] = useState(''),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const editButton = useRef<HTMLButtonElement>(null)
  const [audioOpen, setAudioOpen] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    setChart(null)
    setError('')
    setEditing(false)
    setSaved(false)
    setAudioOpen(false)
    setConfirm(false)
    if (!id) return
    api<Chart>(endpoints.chart(id), { signal: controller.signal })
      .then(setChart)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message)
      })
    return () => controller.abort()
  }, [id])
  const remove = async () => {
    if (!chart) return
    setError('')
    setBusy(true)
    try {
      await api(endpoints.chart(chart.id), jsonRequest('DELETE', {}, session.csrfToken))
      setConfirm(false)
      navigate('/me/charts')
      notify(t('messages.chartDeleted'), 'success')
    } catch (e) {
      setConfirm(false)
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  if (!id) return <Notice>{t('messages.missingSongId')}</Notice>
  if (!chart)
    return error ? (
      <Notice>{error}</Notice>
    ) : (
      <p className="text-sm text-muted-foreground">{t('messages.loadingChart')}</p>
    )
  if (!supportsChart(chart.difficulties))
    return <Notice>{t('messages.thisChartTypeIsNotSupported')}</Notice>
  return (
    <>
      <div className="flex flex-col gap-6 py-2 sm:flex-row sm:items-start sm:gap-8">
        <ChartCover
          key={chart.id}
          chart={chart}
          onSaved={(coverHash) =>
            setChart((current) => (current?.id === chart.id ? { ...current, coverHash } : current))
          }
        />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {chartText(chart, i18n.resolvedLanguage).title}
          </h1>
          <p className="text-lg text-muted-foreground">
            {chartText(chart, i18n.resolvedLanguage).subtitle}
          </p>
          <div data-testid="detail-facts" className="[&_li]:flex [&_li]:items-center">
            <CategoryLabels ids={chart.categoryIds}>
              <li className="min-w-0 max-w-full">
                <Badge
                  variant="outline"
                  className="min-w-0 max-w-full gap-0 p-0"
                  title={t('messages.chartCreatorWithName', {
                    name: chart.maker || chart.uploader,
                  })}
                >
                  <span className="flex h-full shrink-0 items-center border-r bg-muted px-2 text-muted-foreground">
                    {t('messages.chartCreator')}
                  </span>
                  <span className="truncate px-2">{chart.maker || chart.uploader}</span>
                </Badge>
              </li>
              <li>
                <Badge variant="outline" className="tabular-nums">
                  {chart.bpm} BPM
                </Badge>
              </li>
              <li>
                <Badge variant="outline" className="tabular-nums" title={t('messages.duration')}>
                  <ClockIcon className="size-3" aria-hidden="true" />
                  {Math.floor(chart.duration / 60)}:
                  {String(Math.floor(chart.duration % 60)).padStart(2, '0')}
                </Badge>
              </li>
            </CategoryLabels>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              className={buttonVariants({ variant: 'default', size: 'default' })}
              href={endpoints.resource(chart, 'download')}
            >
              <Download size={17} />
              {t('messages.downloadChartPackage')}
            </a>
            <Button variant="outline" onClick={() => setAudioOpen(true)}>
              <HeadphonesIcon size={17} aria-hidden="true" />
              {t('messages.listen')}
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<a href={endpoints.resource(chart, 'tja')} />}
            >
              <ArrowSquareOutIcon size={17} aria-hidden="true" />
              {t('messages.sourceFiles')}
            </Button>
            {session.user && (session.user.id === chart.ownerId || session.user.isAdmin) && (
              <Link
                className={buttonVariants({ variant: 'outline', size: 'default' })}
                to={`/charts/${chart.id}/update`}
              >
                {t('messages.updateSongAndCharts')}
              </Link>
            )}
            {session.user && (session.user.id === chart.ownerId || session.user.isAdmin) && (
              <Button
                ref={editButton}
                variant="outline"
                size="default"
                onClick={() => {
                  setSaved(false)
                  setEditing(true)
                }}
              >
                <Pencil size={16} />
                {t('messages.editInformation')}
              </Button>
            )}
          </div>
        </div>
      </div>
      {error && <Notice>{error}</Notice>}
      {saved && (
        <Modal
          title={t('messages.success')}
          finalFocus={editButton}
          onDismiss={() => setSaved(false)}
        >
          {t('messages.chartInformationSaved')}
        </Modal>
      )}
      {editing && session.user && (session.user.id === chart.ownerId || session.user.isAdmin) && (
        <EditMetadata
          key={chart.id}
          chart={chart}
          csrf={session.csrfToken}
          onDismiss={() => setEditing(false)}
          onSaved={(updated) => {
            setChart(updated)
            setEditing(false)
            setSaved(true)
          }}
        />
      )}
      <div className="chart-information grid gap-8 rounded-2xl bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-12 dark:bg-card">
        <section aria-labelledby="chart-description-heading" className="min-w-0 space-y-6">
          <h2 id="chart-description-heading" className="text-xl font-semibold tracking-tight">
            {t('messages.aboutThisChart')}
          </h2>
          <p className="max-w-[70ch] whitespace-pre-wrap text-sm leading-7 text-muted-foreground wrap-anywhere">
            {chart.description || t('messages.noDescriptionFromTheUploaderYet')}
          </p>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">{t('messages.difficulties')}</h3>
            <DifficultyBadges difficulties={chart.difficulties} detailed />
          </div>
        </section>
        <section aria-labelledby="chart-submission-heading" className="min-w-0 space-y-6">
          <h2 id="chart-submission-heading" className="text-xl font-semibold tracking-tight">
            {t('messages.submissionDetails')}
          </h2>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm [&>dt]:text-muted-foreground [&>dd]:wrap-anywhere">
            <dt>{t('messages.uploader')}</dt>
            <dd>
              <Link
                className="text-primary hover:underline"
                to={`/users/${encodeURIComponent(chart.ownerId)}`}
              >
                {chart.uploader}
              </Link>
            </dd>
            <dt>{t('messages.published')}</dt>
            <dd>
              {new Date(chart.createdAt).toLocaleDateString(formatLocale(i18n.resolvedLanguage))}
            </dd>
            <dt>{t('messages.chartFile')}</dt>
            <dd>{chart.tjaName}</dd>
            <dt>{t('messages.audioFile')}</dt>
            <dd>{chart.wave}</dd>
            <dt>{t('messages.audioSize')}</dt>
            <dd>{(chart.audioSize / 1024 / 1024).toFixed(1)} MiB</dd>
            <dt>{t('messages.textEncoding')}</dt>
            <dd>{chart.encoding.toUpperCase()}</dd>
          </dl>
          {session.user?.id === chart.ownerId && (
            <div className="border-t pt-4">
              <Button
                variant="ghost"
                size="default"
                className="text-destructive"
                onClick={() => setConfirm(true)}
              >
                <Trash2 size={15} />
                {t('messages.deleteChart')}
              </Button>
              {confirm && (
                <Modal
                  title={t('messages.deleteThisChart')}
                  busy={busy}
                  onDismiss={() => setConfirm(false)}
                  actions={
                    <>
                      <DialogClose
                        render={<Button type="button" variant="outline" size="default" />}
                        disabled={busy}
                      >
                        {t('messages.cancel')}
                      </DialogClose>
                      <Button
                        type="button"
                        variant="destructive"
                        size="default"
                        disabled={busy}
                        onClick={remove}
                      >
                        {busy ? t('messages.deleting') : t('messages.confirmDeletion')}
                      </Button>
                    </>
                  }
                >
                  {t('messages.theChartAndDownloadLinkWillNoLongerBePublicAfterDeletion')}
                </Modal>
              )}
            </div>
          )}
        </section>
      </div>
      <ChartActivity key={`${chart.id}:${chart.tjaHash}:${chart.audioHash}`} chart={chart} />
      {audioOpen && (
        <Modal title={t('messages.listen')} onDismiss={() => setAudioOpen(false)} actions={null}>
          <p className="text-sm text-muted-foreground">
            {chart.audioName.toLowerCase().endsWith('.mp3') ? 'MP3' : 'OGG / Vorbis'}
          </p>
          <AudioPlayer
            label={t('messages.audioPreview')}
            src={endpoints.resource(chart, 'audio')}
            startAt={chart.demoStart}
          />
        </Modal>
      )}
    </>
  )
}
