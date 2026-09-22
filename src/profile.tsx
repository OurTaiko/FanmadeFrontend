import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Link } from 'react-router-dom'
import { ArrowUpRightIcon as ArrowUpRight } from '@phosphor-icons/react'
import { useSession } from './session-context'
import { Notice } from './components'

export function ProfilePage() {
  const session = useSession()
  if (session.loading) return <p role="status">正在读取个人资料…</p>
  if (!session.user)
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed bg-card/60 px-6 py-16 text-center [&>p]:max-w-lg [&>p]:text-muted-foreground">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">登录后查看个人资料</h1>
        {session.error && <Notice>{session.error}</Notice>}
        <p>昵称和密码在 OurTaiko 账号中心管理。</p>
        <Link
          className={buttonVariants({ variant: 'default', size: 'default' })}
          to="/login?returnTo=/me/profile"
        >
          前往登录
        </Link>
      </div>
    )
  const user = session.user
  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center [&_p]:mt-2 [&_p]:text-sm [&_p]:text-muted-foreground">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">个人资料</h1>
          <p>你的 OurTaiko 账号，与你的作品一起。</p>
        </div>
      </div>
      {session.error && <Notice>{session.error}</Notice>}
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card
          className="min-w-0 border p-5 shadow-none ring-0 sm:p-6 items-center text-center"
          aria-label="公开昵称"
        >
          <Avatar className="size-16">
            <AvatarFallback className="text-2xl">{Array.from(user.nickname)[0]}</AvatarFallback>
          </Avatar>
          <h2 className="text-base font-semibold">{user.nickname}</h2>
          <p className="text-sm text-muted-foreground">其他人看到的名字</p>
        </Card>
        <Card className="min-w-0 border p-5 shadow-none ring-0 sm:p-6 gap-4" aria-label="账号资料">
          <Label htmlFor="profile-username">用户名</Label>
          <Input id="profile-username" value={user.username} readOnly />
          <Label htmlFor="profile-nickname">昵称</Label>
          <Input id="profile-nickname" value={user.nickname} readOnly />
          <p className="text-sm text-muted-foreground">
            前往账号中心修改昵称、管理密码与登录设备。返回本页时会自动刷新资料。
          </p>
          <a
            className={buttonVariants({ variant: 'default', size: 'default' })}
            href="/api/v1/auth/account/profile"
            target="_blank"
            rel="noopener noreferrer"
          >
            管理 OurTaiko 账号 <ArrowUpRight size={17} />
          </a>
        </Card>
      </div>
    </>
  )
}
