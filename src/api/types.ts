import type { Metadata } from '../tja'
export type User = {
  id: string
  username: string
  nickname: string
  emailVerified: boolean
  isAdmin: boolean
  preferredLanguage?: string
}
export type Locale = 'ja' | 'zh' | 'ko'
export type Session = { user: User | null; csrfToken: string }
export type Category = { id: string; title: string; genre: string }
export type Chart = Omit<Metadata, 'difficulties'> & {
  difficulties: (Metadata['difficulties'][number] & {
    style: 'Single' | 'Double'
    cloudScoreEligible: boolean
  })[]
  id: string
  coverHash?: string
  categoryIds: string[]
  ownerId: string
  uploader: string
  description: string
  createdAt: string
  duration: number
  encoding: string
  tjaName: string
  audioName: string
  tjaHash: string
  audioHash: string
  audioSize: number
  titleTranslations: Partial<Record<Locale, string>>
  subtitleTranslations: Partial<Record<Locale, string>>
}
export type ChartList = { items: Chart[]; total: number; page: number; pageSize: number }
export type LeaderboardEntry = {
  id: string
  userId: string
  nickname: string
  rank: number
  score: number
  good: number
  ok: number
  bad: number
  drumroll: number
  submittedAt: string
}
export type Leaderboard = {
  songId: string
  difficulty: string
  supported: boolean
  items: LeaderboardEntry[]
  total: number
  page: number
  pageSize: number
}

export type PublicUser = {
  id: string
  nickname: string | null
  firstLoginAt: string | null
  lastActiveAt: string | null
  chartCount: number
  scoreCount: number
}
export type UserDirectory = {
  items: PublicUser[]
  total: number
  page: number
  pageSize: number
  profilesAvailable: boolean
}

export type UserSpace = { user: PublicUser; profilesAvailable: boolean }
