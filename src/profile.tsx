import { Link } from 'react-router-dom'
import { ArrowUpRight, UserRound } from 'lucide-react'
import { useSession } from './session-context'
import { Notice } from './components'

export function ProfilePage() {
  const session = useSession()
  if (session.loading) return <p role="status">正在读取个人资料…</p>
  if (!session.user)
    return (
      <div className="empty">
        <UserRound size={42} />
        <h1>登录后查看个人资料</h1>
        {session.error && <Notice>{session.error}</Notice>}
        <p>昵称和密码在 OurTaiko 账号中心管理。</p>
        <Link className="button primary" to="/login?returnTo=/me/profile">
          前往登录
        </Link>
      </div>
    )
  const user = session.user
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">MY PROFILE</div>
          <h1>
            个人资料
            <span className="title-dot" />
          </h1>
          <p>你的 OurTaiko 账号，与你的作品一起。</p>
        </div>
      </div>
      {session.error && <Notice>{session.error}</Notice>}
      <div className="profile-layout">
        <section className="panel profile-summary" aria-label="公开昵称">
          <span className="avatar profile-avatar" aria-hidden="true">
            {Array.from(user.nickname)[0]}
          </span>
          <h2>{user.nickname}</h2>
          <p className="muted">其他人看到的名字</p>
        </section>
        <section className="panel profile-form" aria-label="账号资料">
          <label htmlFor="profile-username">用户名</label>
          <input id="profile-username" value={user.username} readOnly />
          <label htmlFor="profile-nickname">昵称</label>
          <input id="profile-nickname" value={user.nickname} readOnly />
          <p className="muted">
            前往账号中心修改昵称、管理密码与登录设备。返回本页时会自动刷新资料。
          </p>
          <a
            className="button primary"
            href="/api/v1/auth/account/profile"
            target="_blank"
            rel="noopener noreferrer"
          >
            管理 OurTaiko 账号 <ArrowUpRight size={17} />
          </a>
        </section>
      </div>
    </>
  )
}
