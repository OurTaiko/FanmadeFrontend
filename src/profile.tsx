import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Check, LoaderCircle, UserRound } from 'lucide-react'
import { api, jsonRequest } from './api'
import type { Session, User } from './api'
import { useSession } from './session-context'
import { useNotification } from './notification-context'

export function ProfilePage() {
  const session = useSession()
  if (session.loading) return <p role="status">正在读取个人资料…</p>
  if (!session.user)
    return (
      <div className="empty">
        <UserRound size={42} />
        <h1>登录后查看个人资料</h1>
        <p>在这里管理你的昵称。</p>
        <Link className="button primary" to="/login">
          前往登录
        </Link>
      </div>
    )
  return <ProfileEditor key={session.user.id} user={session.user} />
}

function ProfileEditor({ user }: { user: User }) {
  const session = useSession()
  const { notify } = useNotification()
  const [nickname, setNickname] = useState(user.nickname)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])
  const trimmed = nickname.trim()
  const length = Array.from(trimmed).length
  const valid = length >= 1 && length <= 40 && !/[\p{Cc}\u2028\u2029]/u.test(trimmed)
  const changed = trimmed !== user.nickname
  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!valid || !changed || busy) return
    setBusy(true)
    setSaved(false)
    const abort = new AbortController()
    controller.current = abort
    try {
      const updated = await api<Session & { user: User }>('/me', {
        ...jsonRequest('PATCH', { nickname: trimmed }, session.csrfToken),
        signal: abort.signal,
      })
      if (abort.signal.aborted) return
      session.setSession(updated)
      setNickname(updated.user.nickname)
      setSaved(true)
    } catch (error) {
      if (!abort.signal.aborted) notify((error as Error).message, 'error')
    } finally {
      if (!abort.signal.aborted) setBusy(false)
      if (controller.current === abort) controller.current = null
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">MY PROFILE</div>
          <h1>
            个人资料
            <span className="title-dot" />
          </h1>
          <p>用喜欢的昵称，出现在你的作品和排行榜上。</p>
        </div>
      </div>
      <div className="profile-layout">
        <section className="panel profile-summary" aria-label="公开昵称">
          <span className="avatar profile-avatar" aria-hidden="true">
            {Array.from(user.nickname)[0]}
          </span>
          <h2>{user.nickname}</h2>
          <p className="muted">其他人看到的名字</p>
        </section>
        <form className="panel profile-form" onSubmit={save}>
          <label htmlFor="profile-username">用户名</label>
          <input
            id="profile-username"
            value={user.username}
            readOnly
            aria-describedby="username-help"
          />
          <p className="muted field-help" id="username-help">
            仅自己可见，用于登录，不能修改。
          </p>
          <label htmlFor="profile-nickname">昵称</label>
          <input
            id="profile-nickname"
            autoComplete="nickname"
            value={nickname}
            required
            maxLength={160}
            disabled={busy}
            aria-describedby="nickname-help nickname-count"
            aria-invalid={!valid}
            onChange={(event) => {
              setNickname(event.target.value)
              setSaved(false)
            }}
          />
          <div className="nickname-help-row">
            <p className="muted field-help" id="nickname-help">
              1–40 个字符，支持中文和表情，允许重名。
            </p>
            <span className={valid ? 'muted' : 'field-error'} id="nickname-count">
              {length} / 40
            </span>
          </div>
          {!valid && (
            <p className="field-error" role="alert">
              昵称不能为空或超过 40 个字符，不能包含换行或控制字符。
            </p>
          )}
          <button className="button primary" disabled={busy || !valid || !changed}>
            {busy ? <LoaderCircle size={17} className="spin" /> : <Check size={17} />}
            {busy ? '正在保存…' : '保存昵称'}
          </button>
          <p className="profile-save-status" role="status">
            {saved ? '昵称已保存。' : ''}
          </p>
        </form>
      </div>
    </>
  )
}
