import {
  AppStoreLogoIcon,
  ArrowSquareOutIcon,
  DownloadSimpleIcon,
  GameControllerIcon,
  GithubLogoIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const githubRepository = 'https://github.com/OurTaiko/OurTaikoPlay'
const githubReleases = `${githubRepository}/releases`
const testFlight = 'https://testflight.apple.com/join/PGTVXtFq'

export function PlayerPage() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-4 sm:py-8">
      <section className="relative overflow-hidden rounded-4xl border bg-card/85 px-6 py-10 shadow-sm sm:px-10 sm:py-14">
        <div
          className="absolute -right-16 -top-20 size-72 rounded-full bg-red-500/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_auto]">
          <div className="space-y-5">
            <Badge variant="secondary">{t('messages.openSourceTaikoSimulator')}</Badge>
            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">OurTaikoPlay</h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                {t('messages.ourTaikoPlayerDescription')}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                className={buttonVariants({ variant: 'default', size: 'lg' })}
                href={testFlight}
                target="_blank"
                rel="noopener noreferrer"
              >
                <AppStoreLogoIcon className="size-5" aria-hidden="true" />
                {t('messages.joinTestFlight')}
                <ArrowSquareOutIcon className="size-4" aria-hidden="true" />
              </a>
              <a
                className={buttonVariants({ variant: 'outline', size: 'lg' })}
                href={githubRepository}
                target="_blank"
                rel="noopener noreferrer"
              >
                <GithubLogoIcon className="size-5" aria-hidden="true" />
                {t('messages.viewOnGitHub')}
              </a>
              <a
                className={buttonVariants({ variant: 'outline', size: 'lg' })}
                href="https://qm.qq.com/q/UbdxqcTrCm"
                target="_blank"
                rel="noopener noreferrer"
              >
                <UsersThreeIcon className="size-5" aria-hidden="true" />
                {t('messages.joinOurTaikoQQGroup')}
                <ArrowSquareOutIcon className="size-4" aria-hidden="true" />
              </a>
            </div>
          </div>
          <div
            className="relative mx-auto grid size-44 place-items-center rounded-full border-8 border-red-500/20 bg-linear-to-br from-red-500 to-orange-400 shadow-2xl shadow-red-500/20 sm:size-52"
            aria-hidden="true"
          >
            <div className="grid size-32 place-items-center rounded-full border-4 border-white/70 bg-white/90 text-red-500 sm:size-38">
              <GameControllerIcon className="size-16 sm:size-20" weight="fill" />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="gap-4 border bg-card/80 p-6 shadow-none">
          <div className="flex size-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
            <GithubLogoIcon className="size-6" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">{t('messages.ourTaikoOnGitHub')}</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              {t('messages.ourTaikoGitHubDescription')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
              href={githubRepository}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('messages.sourceCode')}
              <ArrowSquareOutIcon className="size-4" aria-hidden="true" />
            </a>
            <a
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
              href={githubReleases}
              target="_blank"
              rel="noopener noreferrer"
            >
              <DownloadSimpleIcon className="size-4" aria-hidden="true" />
              {t('messages.githubReleases')}
            </a>
          </div>
        </Card>

        <Card className="gap-4 border bg-card/80 p-6 shadow-none">
          <div className="flex size-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
            <AppStoreLogoIcon className="size-6" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">{t('messages.testFlightForIos')}</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              {t('messages.testFlightDescription')}
            </p>
          </div>
          <a
            className={buttonVariants({ variant: 'outline', size: 'sm', className: 'w-fit' })}
            href={testFlight}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('messages.openTestFlight')}
            <ArrowSquareOutIcon className="size-4" aria-hidden="true" />
          </a>
        </Card>
      </div>
    </div>
  )
}
