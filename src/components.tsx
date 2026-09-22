import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  CompassIcon as Compass,
  FolderIcon as FolderHeart,
  UploadSimpleIcon as Upload,
  SignOutIcon as LogOut,
  SignInIcon,
  UserIcon as UserRound,
  ListIcon as Menu,
  StarIcon,
} from '@phosphor-icons/react'
import { useState } from 'react'
import { Notice } from './notifications'
import { useSession } from './session-context'
import type { Chart } from './api'
import { coverSource } from './cover'
import { CategoryLabels } from './categories'
import type { Difficulty } from './tja'
import { courseNames, isSupportedCourse, supportsChart } from './courses'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { ThemeToggle } from './theme'
import pageBackground from './assets/page-background.webp'
export { courseNames } from './courses'
export { Notice } from './notifications'

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
  const supported = difficulties.filter((d) => isSupportedCourse(d.course))
  const items = detailed
    ? supported
    : supported.filter(
        (d, index, all) => all.findIndex((other) => other.course === d.course) === index,
      )
  if (bookmarks)
    return (
      <ul aria-label="谱面难度" className="flex w-24 shrink-0 flex-col gap-2 self-start">
        {items.map((d) => (
          <li
            key={d.blockIndex}
            className="flex min-h-8 items-center justify-between gap-1 bg-[#f5f5f7] py-2 pr-3 pl-5 text-xs font-medium text-[#424245] [clip-path:polygon(0_0,100%_0,100%_100%,0_100%,8px_50%)] dark:bg-muted dark:text-foreground"
          >
            <span>{isSupportedCourse(d.course) ? courseNames[d.course] : ''}</span>
            <span
              className="inline-flex items-center gap-0.5 tabular-nums"
              aria-label={`${d.level} 星`}
            >
              <StarIcon
                weight="fill"
                className="size-3 text-[#0071e3] transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none dark:text-blue-400"
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
          className={isSupportedCourse(d.course) ? difficultyColors[d.course] : undefined}
          key={d.blockIndex}
        >
          {isSupportedCourse(d.course) ? courseNames[d.course] : ''}
          {detailed && d.player ? ` ${d.player}` : ''}
          <span
            className="inline-flex items-center gap-1 tabular-nums"
            aria-label={`${d.level} 星`}
          >
            <StarIcon weight="fill" className="size-3" aria-hidden="true" />
            {d.level}
          </span>
        </Badge>
      ))}
    </div>
  )
}

export function ChartCard({ chart }: { chart: Chart }) {
  const [failedSource, setFailedSource] = useState('')
  const source = coverSource(chart)
  const hasCover = !!source && failedSource !== source
  if (!supportsChart(chart.difficulties)) return null
  return (
    <Link
      className="chart-information group block min-w-0 rounded-2xl outline-none transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-4 motion-reduce:transform-none motion-reduce:transition-none"
      data-testid="chart-card"
      to={`/charts/${chart.id}`}
    >
      <Card
        size="sm"
        className="relative isolate h-full rounded-2xl bg-white py-6 shadow-[0_4px_12px_rgba(0,0,0,0.08)] ring-0 dark:bg-card"
      >
        {hasCover && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <img
              src={source}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
              onError={() => setFailedSource(source)}
            />
            <div className="absolute inset-0 bg-white/80 dark:bg-black/75" />
          </div>
        )}
        <CardContent className="relative flex h-full gap-4 pr-0 pl-6">
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            <div className="min-w-0 space-y-0.5">
              <h3 className="truncate text-lg font-semibold tracking-tight" title={chart.title}>
                {chart.title}
              </h3>
              <p
                className="truncate text-sm text-muted-foreground"
                title={chart.subtitle.replace(/^(--|\+\+)/, '') || '太鼓自制谱'}
              >
                {chart.subtitle.replace(/^(--|\+\+)/, '') || '太鼓自制谱'}
              </p>
            </div>
            <CategoryLabels ids={chart.categoryIds}>
              <li className="min-w-0 max-w-full">
                <Badge
                  variant="outline"
                  className="min-w-0 max-w-full gap-0 p-0"
                  title={`谱师：${chart.maker || chart.uploader}`}
                >
                  <span className="flex h-full shrink-0 items-center border-r bg-muted px-2 text-muted-foreground">
                    谱师
                  </span>
                  <span className="truncate px-2">{chart.maker || chart.uploader}</span>
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

export function Layout() {
  const session = useSession()
  const [error, setError] = useState('')
  const links = [
    { to: '/', label: '发现谱面', icon: Compass },
    { to: '/me/charts', label: '我的作品', icon: FolderHeart },
    ...(session.user ? [{ to: '/me/profile', label: '个人资料', icon: UserRound }] : []),
    { to: '/upload', label: '发布谱面', icon: Upload },
  ]
  return (
    <div className="relative isolate min-h-svh bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
        <img
          src={pageBackground}
          alt=""
          className="absolute inset-0 size-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-linear-to-b from-background/55 via-background/75 to-background/95 dark:from-background/80 dark:via-background/90 dark:to-background/95" />
      </div>
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:p-3 focus:text-primary-foreground"
        href="#main"
      >
        跳到主要内容
      </a>
      <header className="sticky top-0 z-30 border-b bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link className="flex shrink-0 items-baseline gap-2 tracking-tight" to="/">
            <span className="bg-linear-to-r from-red-500 via-red-400 to-orange-400 bg-clip-text text-lg font-bold text-transparent">
              OurTaiko
            </span>
            <span className="hidden text-base font-normal text-muted-foreground sm:inline">
              Fanmade
            </span>
          </Link>
          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="主要导航">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(buttonVariants({ variant: isActive ? 'secondary' : 'ghost', size: 'sm' }))
                }
              >
                <Icon className="size-4 opacity-60" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {session.loading ? (
              <span className="text-xs text-muted-foreground">连接中…</span>
            ) : session.user ? (
              <>
                <Link
                  className="flex max-w-40 items-center gap-2 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring"
                  to="/me/profile"
                  aria-label="打开个人资料"
                >
                  <Avatar>
                    <AvatarFallback>{Array.from(session.user.nickname ?? '')[0]}</AvatarFallback>
                  </Avatar>
                  <span data-testid="account-nickname" className="hidden truncate text-sm lg:block">
                    {session.user.nickname}
                  </span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="退出登录"
                  onClick={() => {
                    setError('')
                    void session.logout().catch((e) => setError(e.message))
                  }}
                >
                  <LogOut className="size-4" aria-hidden="true" />
                </Button>
              </>
            ) : (
              <Link className={buttonVariants({ variant: 'ghost', size: 'sm' })} to="/login">
                <SignInIcon className="size-4 opacity-60" aria-hidden="true" />
                登录 / 注册
              </Link>
            )}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" size="icon" aria-label="打开导航" />}
                >
                  <Menu className="size-4" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {links.map(({ to, label, icon: Icon }) => (
                    <DropdownMenuItem key={to} render={<Link to={to} />}>
                      <Icon className="size-4 opacity-60" aria-hidden="true" />
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {(session.error || error) && <Notice>{session.error || error}</Notice>}
        <Outlet />
      </main>
    </div>
  )
}
