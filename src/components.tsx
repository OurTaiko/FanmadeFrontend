import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  CompassIcon as Compass,
  FolderIcon as FolderHeart,
  UploadSimpleIcon as Upload,
  SignOutIcon as LogOut,
  UserIcon as UserRound,
  ListIcon as Menu,
} from '@phosphor-icons/react'
import { useState } from 'react'
import { Notice } from './notifications'
import { useSession } from './session-context'
import type { Chart } from './api'
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
export { courseNames } from './courses'
export { Notice } from './notifications'

export function DifficultyBadges({
  difficulties,
  detailed = false,
}: {
  difficulties: Difficulty[]
  detailed?: boolean
}) {
  const supported = difficulties.filter((d) => isSupportedCourse(d.course))
  const items = detailed
    ? supported
    : supported.filter(
        (d, index, all) => all.findIndex((other) => other.course === d.course) === index,
      )
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((d) => (
        <Badge variant="secondary" key={d.blockIndex}>
          {isSupportedCourse(d.course) ? courseNames[d.course] : ''}
          {detailed && d.player ? ` ${d.player}` : ''}
          <span className="tabular-nums">★ {d.level}</span>
        </Badge>
      ))}
    </div>
  )
}

export function ChartCard({ chart }: { chart: Chart }) {
  if (!supportsChart(chart.difficulties)) return null
  return (
    <Link
      className="block min-w-0 rounded-4xl outline-none focus-visible:ring-3 focus-visible:ring-ring"
      data-testid="chart-card"
      to={`/charts/${chart.id}`}
    >
      <Card className="h-full shadow-none ring-border transition-colors hover:bg-muted/40">
        <CardContent className="flex h-full flex-col gap-4">
          <div className="space-y-1">
            <h3 className="line-clamp-2 text-lg font-semibold wrap-anywhere">{chart.title}</h3>
            <p className="line-clamp-1 text-sm text-muted-foreground">
              {chart.subtitle.replace(/^(--|\+\+)/, '') || '太鼓自制谱'}
            </p>
          </div>
          <CategoryLabels ids={chart.categoryIds} />
          <DifficultyBadges difficulties={chart.difficulties} />
          <div className="mt-auto flex items-center justify-between gap-4 border-t pt-4 text-xs text-muted-foreground">
            <span className="shrink-0 tabular-nums">{chart.bpm} BPM</span>
            <span className="truncate">{chart.maker || chart.uploader}</span>
          </div>
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
    <div className="min-h-svh bg-background text-foreground">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:p-3 focus:text-primary-foreground"
        href="#main"
      >
        跳到主要内容
      </a>
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link className="shrink-0 text-base font-semibold tracking-tight" to="/">
            OurTaiko <span className="hidden text-muted-foreground sm:inline">Fanmade</span>
          </Link>
          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="主要导航">
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(buttonVariants({ variant: isActive ? 'secondary' : 'ghost', size: 'sm' }))
                }
              >
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
                  <LogOut />
                </Button>
              </>
            ) : (
              <Link className={buttonVariants({ variant: 'outline', size: 'sm' })} to="/login">
                登录 / 注册
              </Link>
            )}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" size="icon" aria-label="打开导航" />}
                >
                  <Menu />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {links.map(({ to, label, icon: Icon }) => (
                    <DropdownMenuItem key={to} render={<Link to={to} />}>
                      <Icon />
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
