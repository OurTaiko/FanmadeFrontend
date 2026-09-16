import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  Disc3,
  Compass,
  FolderHeart,
  Upload,
  ArrowUpRight,
  LogOut,
  Music2,
  Headphones,
  ChevronRight,
  UserRound,
} from 'lucide-react'
import { useState } from 'react'
import { Notice } from './notifications'
import { useSession } from './session-context'
import type { Chart } from './api'
import { CategoryLabels } from './categories'
import type { Difficulty } from './tja'

import { courseNames, isSupportedCourse, supportsChart } from './courses'
export { courseNames } from './courses'

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
    <div className="difficulty-list">
      {items.map((d) => (
        <span className={`difficulty ${d.course.toLowerCase()}`} key={d.blockIndex}>
          <span>
            {isSupportedCourse(d.course) ? courseNames[d.course] : ''}
            {detailed && d.player ? ` ${d.player}` : ''}
          </span>
          <b>★ {d.level}</b>
        </span>
      ))}
    </div>
  )
}
export function Cover({
  chart,
  large = false,
}: {
  chart: Pick<Chart, 'title' | 'id'>
  large?: boolean
}) {
  const colors = ['red', 'blue', 'violet', 'gold']
  const color = colors[parseInt(chart.id.slice(-2), 16) % colors.length || 0]
  return (
    <div className={`cover ${color} ${large ? 'large' : ''}`} aria-hidden="true">
      <span className="cover-label">OURTAIKO / FANMADE</span>
      <Disc3 className="cover-disc" strokeWidth={0.8} />
      <span className="cover-title">{chart.title}</span>
      <span className="cover-format">
        TJA <span>＋</span> OGG / MP3
      </span>
    </div>
  )
}
export function ChartCard({ chart }: { chart: Chart }) {
  if (!supportsChart(chart.difficulties)) return null
  return (
    <Link className="chart-card" to={`/charts/${chart.id}`}>
      <Cover chart={chart} />
      <div className="card-content">
        <div className="card-title">
          <h3>{chart.title}</h3>
          <ArrowUpRight size={18} />
        </div>
        <p className="card-subtitle">{chart.subtitle.replace(/^(--|\+\+)/, '') || '太鼓自制谱'}</p>
        <CategoryLabels ids={chart.categoryIds} />
        <DifficultyBadges difficulties={chart.difficulties} />
        <div className="card-footer">
          <span>
            <Music2 size={13} />
            {chart.bpm} BPM
          </span>
          <span>{chart.maker || chart.uploader}</span>
        </div>
      </div>
    </Link>
  )
}
export { Notice } from './notifications'
export function Layout() {
  const session = useSession(),
    [error, setError] = useState('')
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        跳到主要内容
      </a>
      <aside className="sidebar">
        <Link className="brand" to="/">
          <img
            className="brand-icon"
            src={`${import.meta.env.BASE_URL}icons/icon-192.png`}
            alt=""
            width={43}
            height={43}
          />
          <span>
            OurTaiko<small>FANMADE</small>
          </span>
        </Link>
        <div className="nav-caption">你的谱面世界</div>
        <nav aria-label="主要导航">
          <NavLink to="/" end>
            <Compass size={20} />
            发现谱面
          </NavLink>
          <NavLink to="/me/charts">
            <FolderHeart size={20} />
            我的作品
          </NavLink>
          {session.user && (
            <NavLink to="/me/profile">
              <UserRound size={20} />
              个人资料
            </NavLink>
          )}
          <NavLink to="/upload">
            <Upload size={20} />
            发布谱面<span className="nav-plus">＋</span>
          </NavLink>
        </nav>
        <div className="sidebar-bottom">
          <Headphones size={25} />
          <p>
            从一份谱面，
            <br />
            开始下一次演奏。
          </p>
          <small>OurTaiko Fanmade · 本地示范版</small>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span className="breadcrumb">
            Fanmade <ChevronRight size={14} /> 谱面社区
          </span>
          <div className="account">
            {session.loading ? (
              <span>连接中…</span>
            ) : session.user ? (
              <>
                <Link className="account-profile" to="/me/profile" aria-label="打开个人资料">
                  <span className="avatar" aria-hidden="true">
                    {Array.from(session.user.nickname ?? '')[0]}
                  </span>
                  <span className="account-nickname">{session.user.nickname}</span>
                </Link>
                <button
                  className="icon-button"
                  aria-label="退出登录"
                  onClick={() => {
                    setError('')
                    void session.logout().catch((e) => setError(e.message))
                  }}
                >
                  <LogOut size={17} />
                </button>
              </>
            ) : (
              <Link className="button small secondary" to="/login">
                登录 / 注册
              </Link>
            )}
          </div>
        </header>
        <main id="main">
          {(session.error || error) && <Notice>{session.error || error}</Notice>}
          <Outlet />
        </main>
        <footer className="site-footer">
          <span>OURTAIKO FANMADE</span>
          <span>为每一份热爱，留下节拍。</span>
        </footer>
      </div>
    </div>
  )
}
