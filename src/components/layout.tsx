import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  CompassIcon as Compass,
  FolderIcon as FolderHeart,
  UploadSimpleIcon as Upload,
  SignOutIcon as LogOut,
  SignInIcon,
  UserIcon as UserRound,
  ListIcon as Menu,
} from '@phosphor-icons/react'
import { useState } from 'react'
import { Notice } from '@/notifications'
import { useSession } from '@/session-context'
import { Button, buttonVariants } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/theme'
import pageBackground from '@/assets/page-background.webp'

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
    <div className="isolate relative bg-background min-h-svh text-foreground">
      <div className="-z-10 fixed inset-0 pointer-events-none" aria-hidden="true">
        <img
          src={pageBackground}
          alt=""
          className="absolute inset-0 size-full object-center object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-b from-background/55 dark:from-background/80 via-background/75 dark:via-background/90 to-background/95 dark:to-background/95" />
      </div>
      <a
        className="sr-only focus:not-sr-only focus:top-2 focus:left-2 focus:z-50 focus:fixed focus:bg-primary focus:p-3 focus:rounded-lg focus:text-primary-foreground"
        href="#main"
      >
        跳到主要内容
      </a>
      <header className="top-0 z-30 sticky bg-background/70 backdrop-blur-xl border-b">
        <div className="flex items-center gap-4 mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl h-16">
          <Link className="flex items-baseline gap-2 tracking-tight shrink-0" to="/">
            <span className="bg-clip-text bg-linear-to-r from-red-500 via-red-400 to-orange-400 font-bold text-transparent text-lg">
              OurTaiko
            </span>
            <span className="hidden sm:inline font-normal text-muted-foreground text-base">
              Fanmade
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 ml-4" aria-label="主要导航">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(buttonVariants({ variant: isActive ? 'secondary' : 'ghost', size: 'sm' }))
                }
              >
                <Icon className="opacity-60 size-4" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2 ml-auto">
            <ThemeToggle />
            {session.loading ? (
              <span className="text-muted-foreground text-xs">连接中…</span>
            ) : session.user ? (
              <>
                <Link
                  className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring max-w-40"
                  to="/me/profile"
                  aria-label="打开个人资料"
                >
                  <Avatar>
                    <AvatarFallback>{Array.from(session.user.nickname ?? '')[0]}</AvatarFallback>
                  </Avatar>
                  <span data-testid="account-nickname" className="hidden lg:block text-sm truncate">
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
                <SignInIcon className="opacity-60 size-4" aria-hidden="true" />
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
                      <Icon className="opacity-60 size-4" aria-hidden="true" />
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>
      <main id="main" className="space-y-6 mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full max-w-7xl">
        {(session.error || error) && <Notice>{session.error || error}</Notice>}
        <Outlet />
      </main>
    </div>
  )
}
