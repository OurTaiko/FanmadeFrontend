import { chartText } from '@/chart-language'
import { i18n } from '@/i18n'
import { useTranslation } from 'react-i18next'
import { endpoints } from '@/api/endpoints'
import { DialogClose } from '@/components/ui/dialog'
import { AudioPlayer } from '@/components/audio-player'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowRightIcon as ArrowRight,
  WaveformIcon as AudioLines,
  FileAudioIcon as FileMusic,
  CheckIcon as Check,
  CircleNotchIcon as LoaderCircle,
  UploadSimpleIcon as Upload,
} from '@phosphor-icons/react'
import { CoverPicker } from '@/components/cover-picker'
import { CategoryPicker } from './categories'
import { api, uploadChart } from './api/client'
import type { Chart } from './api/types'
import { Modal, Notice } from './notifications'
import { useNotification } from './notification-context'
import { courseNames, isSupportedCourse } from './courses'
import { DifficultyBadges } from '@/components/difficulty-badges'
import { useSession } from './session-context'
import { isAudioFilename, prepareTja, validateFiles } from './tja'
import type { PreparedTja } from './tja'

function createRequestKey() {
  // getRandomValues remains available over LAN HTTP, unlike randomUUID.
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function UpdatePage() {
  const { t } = useTranslation()

  const { id } = useParams()
  const session = useSession()
  const [chart, setChart] = useState<Chart | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    setChart(null)
    setError('')
    if (!id) return
    api<Chart>(endpoints.chart(id), { signal: controller.signal })
      .then((loaded) => {
        if (!controller.signal.aborted) setChart(loaded)
      })
      .catch((e: Error) => {
        if (!controller.signal.aborted) setError(e.message)
      })
    return () => controller.abort()
  }, [id])
  if (!id) return <Notice>{t('messages.missingSongId')}</Notice>
  if (error) return <Notice>{error}</Notice>
  if (!chart || session.loading) return <p role="status">{t('messages.loadingSong')}</p>
  if (!session.user || (session.user.id !== chart.ownerId && !session.user.isAdmin))
    return <p>{t('messages.onlyTheUploaderOrAnAdministratorCanUpdateThisSong')}</p>
  return <UploadPage key={`${chart.id}:${chart.tjaHash}:${chart.audioHash}`} existing={chart} />
}

export function UploadPage({ existing }: { existing?: Chart }) {
  const { t } = useTranslation()

  const { notify } = useNotification()
  const session = useSession(),
    navigate = useNavigate()
  const [tja, setTja] = useState<File | null>(null),
    [audio, setAudio] = useState<File | null>(null)
  const [cover, setCover] = useState<File | null>(null)
  const [metadata, setMetadata] = useState<PreparedTja | null>(null),
    [validating, setValidating] = useState(false),
    [validationError, setValidationError] = useState('')
  const [categoryIds, setCategoryIds] = useState<string[]>(existing?.categoryIds ?? [])
  const [description, setDescription] = useState(existing?.description ?? ''),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [audioUrl, setAudioUrl] = useState('')
  const [confirming, setConfirming] = useState(false)
  const retainedAudioName = existing?.audioName
  const requestKey = useRef(createRequestKey()),
    controller = useRef<AbortController | null>(null)
  const reset = () => {
    setMetadata(null)
    setValidationError('')
    requestKey.current = createRequestKey()
  }
  useEffect(() => {
    let active = true
    setMetadata(null)
    setValidationError('')
    if (!tja || (!audio && !retainedAudioName)) {
      setValidating(false)
      return
    }
    setValidating(true)
    const validation = audio ? validateFiles(tja, audio) : prepareTja(tja, retainedAudioName!)
    validation
      .then((m) => {
        if (active) setMetadata(m)
      })
      .catch((e) => {
        if (active) setValidationError(e.message)
      })
      .finally(() => {
        if (active) setValidating(false)
      })
    return () => {
      active = false
    }
  }, [tja, audio, retainedAudioName])
  useEffect(() => {
    if (!audio) {
      setAudioUrl('')
      return
    }
    const url = URL.createObjectURL(audio)
    setAudioUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [audio])
  useEffect(() => () => controller.current?.abort(), [])
  const choose = (kind: 'tja' | 'audio', e: ChangeEvent<HTMLInputElement>) => {
    reset()
    const file = e.target.files?.[0] ?? null
    if (kind === 'tja') setTja(file)
    else setAudio(file)
  }
  const drop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (busy) return
    const files = Array.from(e.dataTransfer.files),
      charts = files.filter((f) => /\.tja$/i.test(f.name)),
      tracks = files.filter((f) => isAudioFilename(f.name))
    reset()
    if (charts.length > 1 || tracks.length > 1 || charts.length + tracks.length !== files.length) {
      notify(t('messages.dropOneTjaAndOneOggOrMp3NoAdditionalFiles'), 'error')
      return
    }
    if (charts[0]) setTja(charts[0])
    if (tracks[0]) setAudio(tracks[0])
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!metadata || busy) return
    if (existing) setConfirming(true)
    else void save()
  }
  const save = async () => {
    if (!tja || (!audio && !existing) || !metadata || busy) return
    setConfirming(false)
    setBusy(true)
    setProgress(0)
    const abort = new AbortController()
    controller.current = abort
    try {
      const prepared = audio
        ? await validateFiles(tja, audio)
        : await prepareTja(tja, existing!.audioName)
      if (abort.signal.aborted) return
      const form = new FormData()
      form.append('tja', prepared.file)
      if (audio) form.append('audio', audio)
      if (cover && !existing) form.append('cover', cover)
      if (existing) {
        form.append('confirmReset', 'true')
      }
      form.append('encoding', 'utf-8')
      form.append('description', description)
      form.append('categoryIds', JSON.stringify(categoryIds))
      form.append(
        'difficultyMakers',
        JSON.stringify(
          metadata.difficulties.map(({ blockIndex, maker }) => ({ blockIndex, maker })),
        ),
      )
      const chart = await uploadChart(
        form,
        session.csrfToken,
        requestKey.current,
        abort.signal,
        setProgress,
        existing?.id,
      )
      navigate(`/charts/${chart.id}`)
      notify(
        existing
          ? t('messages.songUpdatedAllPreviousChartsAndScoresHaveBeenDeleted')
          : t('messages.chartPublished'),
        'success',
      )
    } catch (e) {
      if (!abort.signal.aborted) notify((e as Error).message, 'error')
    } finally {
      setBusy(false)
      controller.current = null
    }
  }
  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center [&_p]:mt-2 [&_p]:text-sm [&_p]:text-muted-foreground">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {existing ? t('messages.updateSongAndCharts') : t('messages.publishYourChart')}
          </h1>
          <p>
            {existing
              ? t('messages.replaceSongHint', {
                  title: chartText(existing, i18n.resolvedLanguage).title,
                })
              : t('messages.prepareATjaAndMatchingOggOrMp3EasyNormalHardOni')}
          </p>
        </div>
      </div>
      {!session.loading && !session.user && (
        <Notice kind="info" title={t('messages.signInToPublish')}>
          {t('messages.youCanCheckYourFilesFirstSignInOrRegisterAtThe')}
        </Notice>
      )}
      {existing && (
        <Card
          className="min-w-0 border p-5 shadow-none ring-0 sm:p-6 gap-3 border-destructive/30 [&>h2]:text-destructive [&>p]:text-sm [&>p]:leading-relaxed"
          aria-label={t('messages.beforeUpdating')}
        >
          <h2 className="text-base font-semibold">
            {t('messages.updatingDeletesAllPreviousScores')}
          </h2>
          <p>{t('messages.theNewTjaReplacesEveryChartInThisSongAllPlayersScores')}</p>
          <p>{t('messages.theSongUrlStaysTheSameTitlesComeFromTheNewTja')}</p>
        </Card>
      )}
      <form
        onSubmit={submit}
        className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] [&>div]:space-y-6 [&>aside]:space-y-3"
      >
        <div>
          <Card className="min-w-0 border p-5 shadow-none ring-0 sm:p-6 gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold">{t('messages.chooseFiles')}</h2>
              <span className="text-sm text-muted-foreground">
                {existing
                  ? t('messages.newTjaRequiredCurrentAudioCanBeKept')
                  : t('messages.bothFilesAreRequired')}
              </span>
            </div>
            <div
              className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground [&>strong]:text-foreground"
              onDragOver={(e) => e.preventDefault()}
              onDrop={drop}
            >
              <Upload size={26} />
              <strong>{t('messages.dropChartAndAudioHere')}</strong>
              <span>{t('messages.orChooseFilesBelow')}</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {(['tja', 'audio'] as const).map((kind) => {
                const file = kind === 'tja' ? tja : audio
                return (
                  <Label
                    className="flex min-w-0 flex-col items-start gap-3 rounded-2xl border p-4 [&>span]:w-full [&_small]:mt-1 [&_small]:block [&_small]:truncate [&_small]:text-muted-foreground"
                    key={kind}
                  >
                    {kind === 'tja' ? <FileMusic size={24} /> : <AudioLines size={24} />}
                    <span>
                      <b>{kind === 'tja' ? t('messages.tjaChart') : t('messages.oggMp3Audio')}</b>
                      <small>
                        {file
                          ? file.name
                          : kind === 'tja'
                            ? t('messages.tjaUpTo2Mib')
                            : existing
                              ? t('messages.keepAudio', { filename: existing.audioName })
                              : t('messages.oggMp3UpTo100Mib')}
                      </small>
                    </span>
                    {file ? (
                      <Check size={18} />
                    ) : (
                      <span className="text-xs text-muted-foreground">{t('messages.choose')}</span>
                    )}
                    <Input
                      type="file"
                      aria-label={
                        kind === 'tja'
                          ? t('messages.chooseTjaChart')
                          : t('messages.chooseOggOrMp3Audio')
                      }
                      accept={kind === 'tja' ? '.tja' : '.ogg,.mp3'}
                      disabled={busy}
                      onChange={(e) => choose(kind, e)}
                    />
                  </Label>
                )
              })}
            </div>
            {existing && audio && (
              <Button
                type="button"
                variant="ghost"
                size="default"
                disabled={busy}
                onClick={() => {
                  reset()
                  setAudio(null)
                }}
              >
                {t('messages.currentAudio', { filename: existing.audioName })}
              </Button>
            )}
            {validationError && (
              <Notice title={t('messages.fileValidationFailed')}>{validationError}</Notice>
            )}
            {metadata && (
              <Notice kind="success" title={t('messages.localValidationPassed')}>
                {t('messages.encodingDetected', {
                  encoding: metadata.sourceEncoding,
                  filename: metadata.wave,
                })}
              </Notice>
            )}
          </Card>
          {!existing && (
            <Card className="min-w-0 gap-4 rounded-2xl p-6 shadow-none ring-0">
              <h2 className="text-base font-semibold">{t('messages.songCover')}</h2>
              <CoverPicker
                file={cover}
                disabled={busy}
                onChange={(file) => {
                  setCover(file)
                  requestKey.current = createRequestKey()
                }}
              />
            </Card>
          )}
          <Card className="min-w-0 border p-5 shadow-none ring-0 sm:p-6 gap-4">
            <CategoryPicker
              value={categoryIds}
              disabled={busy}
              onChange={(ids) => {
                setCategoryIds(ids)
                requestKey.current = createRequestKey()
              }}
            />
          </Card>
          {metadata && (
            <Card className="min-w-0 border p-5 shadow-none ring-0 sm:p-6 gap-4">
              <h2 className="text-base font-semibold">{t('messages.difficultiesAndCreators')}</h2>
              <p className="text-sm text-muted-foreground">
                {metadata.maker
                  ? t('messages.creatorNamesAreFilledFromMakerYouCanEditEachOne')
                  : t('messages.noMakerWasSpecifiedEnterACreatorForEachDifficulty')}
              </p>
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">{t('messages.difficulty')}</TableHead>
                    <TableHead scope="col">{t('messages.creator')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metadata.difficulties.map((d) => (
                    <TableRow key={d.blockIndex}>
                      <TableHead scope="row">
                        {isSupportedCourse(d.course) ? courseNames[d.course] : d.course} ·{' '}
                        {d.course} ★{d.level}
                        {d.player && ` · ${d.player}`} <small>#{d.blockIndex + 1}</small>
                      </TableHead>
                      <TableCell>
                        <Input
                          aria-label={t('messages.difficultyCreator', {
                            difficulty: d.course,
                            player: d.player ? ` ${d.player}` : '',
                            block: d.blockIndex + 1,
                          })}
                          value={d.maker}
                          maxLength={500}
                          placeholder={t('messages.notSpecified')}
                          disabled={busy}
                          onChange={(e) => {
                            const maker = e.target.value
                            setMetadata(
                              (current) =>
                                current && {
                                  ...current,
                                  difficulties: current.difficulties.map((block) =>
                                    block.blockIndex === d.blockIndex ? { ...block, maker } : block,
                                  ),
                                },
                            )
                            requestKey.current = createRequestKey()
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
          <Card className="min-w-0 border p-5 shadow-none ring-0 sm:p-6 gap-4">
            <h2 className="text-base font-semibold">
              {t('messages.addADescription')}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {t('messages.optional2')}
              </span>
            </h2>
            <Label className="sr-only" htmlFor="description">
              {t('messages.submissionDescription')}
            </Label>
            <Textarea
              id="description"
              rows={5}
              maxLength={1000}
              placeholder={t('messages.describeThisChartOrLeaveAMessage')}
              value={description}
              disabled={busy}
              onChange={(e) => {
                setDescription(e.target.value)
                requestKey.current = createRequestKey()
              }}
            />
            <span className="text-right text-xs text-muted-foreground">
              {description.length} / 1000
            </span>
          </Card>
        </div>
        <aside>
          <Card
            data-testid="preview-panel"
            className="min-w-0 border p-5 shadow-none ring-0 sm:p-6 gap-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold">
                {existing ? t('messages.updatePreview') : t('messages.submissionPreview')}
              </h2>
            </div>
            {metadata ? (
              <>
                <p className="text-sm text-muted-foreground">{metadata.bpm} BPM</p>
                <h3 className="text-base font-medium">
                  {chartText(metadata, i18n.resolvedLanguage).title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {chartText(metadata, i18n.resolvedLanguage).subtitle || t('messages.taikoChart')}
                </p>
                <DifficultyBadges difficulties={metadata.difficulties} />
                {audioUrl && <AudioPlayer label={t('messages.localAudioPreview')} src={audioUrl} />}
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm [&>dt]:text-muted-foreground [&>dd]:wrap-anywhere mt-4">
                  <dt>{t('messages.chartCreator')}</dt>
                  <dd>
                    {[
                      ...new Set(metadata.difficulties.map((d) => d.maker.trim()).filter(Boolean)),
                    ].join(' | ') || t('messages.notSpecified')}
                  </dd>
                  <dt>{t('messages.uploader')}</dt>
                  <dd>{session.user?.nickname || t('messages.notSignedIn')}</dd>
                </dl>
              </>
            ) : (
              <div className="flex min-h-32 items-center justify-center text-center text-sm text-muted-foreground">
                <p>{t('messages.chartInformationAppearsHereAfterValidation')}</p>
              </div>
            )}
            <div className="space-y-3 border-t pt-4 [&>p]:text-xs [&>p]:leading-relaxed [&>p]:text-muted-foreground">
              <Button
                type="submit"
                variant="default"
                size="default"
                className="w-full"
                disabled={!metadata || validating || busy || !session.user}
              >
                {busy ? <LoaderCircle className="animate-spin" size={18} /> : <Upload size={18} />}{' '}
                {busy
                  ? t('messages.saving')
                  : validating
                    ? t('messages.validating')
                    : existing
                      ? t('messages.updateSongAndCharts')
                      : t('messages.publishChart')}
                {!busy && <ArrowRight size={17} />}
              </Button>
              {busy && (
                <Modal
                  title={existing ? t('messages.updatingSong') : t('messages.publishingChart')}
                  busy
                  onDismiss={() => {}}
                  actions={
                    <Button
                      type="button"
                      variant="outline"
                      size="default"
                      onClick={() => controller.current?.abort()}
                    >
                      {t('messages.cancelUpload')}
                    </Button>
                  }
                >
                  <div className="space-y-3" role="status">
                    <Progress
                      aria-label={t('messages.uploadProgress')}
                      max={100}
                      value={progress}
                    />
                    <span>
                      {progress < 100
                        ? t('messages.uploadProgressPercent', { progress: progress })
                        : t('messages.uploadedValidatingAndSaving')}
                    </span>
                  </div>
                </Modal>
              )}
              <p>
                {existing
                  ? t('messages.afterUpdatingScoresForEveryDifficultyStartOver')
                  : t('messages.oncePublishedOthersCanBrowseListenToAndDownloadYourChart')}
              </p>
            </div>
          </Card>
          <Button
            type="button"
            variant="ghost"
            size="default"
            className="w-full"
            onClick={() =>
              notify(
                t('messages.waveInTheTjaMustExactlyMatchTheAudioFilenameIncludingCase'),
                'info',
                t('messages.uploadRules'),
              )
            }
          >
            {t('messages.viewUploadRules')}
          </Button>
        </aside>
      </form>
      {confirming && existing && (
        <Modal
          title={t('messages.replaceSongAndDeleteAllPreviousScores')}
          alert
          onDismiss={() => setConfirming(false)}
          actions={
            <>
              <DialogClose render={<Button type="button" variant="outline" size="default" />}>
                {t('messages.cancel')}
              </DialogClose>
              <Button type="button" variant="default" size="default" onClick={() => void save()}>
                {t('messages.replaceAndDelete')}
              </Button>
            </>
          }
        >
          <p>
            {t('upload.replacement', {
              previous: chartText(existing, i18n.resolvedLanguage).title,
              title: metadata ? chartText(metadata, i18n.resolvedLanguage).title : '',
              count: metadata?.difficulties.length ?? 0,
            })}
          </p>
          <p>{t('messages.allPlayersPreviousScoresChartsAndFilesForThisSongWillBe')}</p>
        </Modal>
      )}
    </>
  )
}
