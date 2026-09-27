import { API_ROOT } from './config'
import type { Chart } from './types'

function withQuery(url: string, values: Record<string, string | number>): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) query.set(key, String(value))
  return query.size ? `${url}?${query}` : url
}

const chartPath = (id: string) => `${API_ROOT}/charts/${encodeURIComponent(id)}`

export const endpoints = {
  me: `${API_ROOT}/me`,
  users: (query: { q: string; sort: string; page: number }) =>
    withQuery(`${API_ROOT}/users`, query),
  user: (id: string) => `${API_ROOT}/users/${encodeURIComponent(id)}`,
  categories: `${API_ROOT}/categories`,
  uploadRules: `${API_ROOT}/upload-rules`,
  logout: `${API_ROOT}/auth/logout`,
  login: (returnTo: string) => withQuery(`${API_ROOT}/auth/sso/login`, { returnTo }),
  accountRegister: `${API_ROOT}/auth/account/register`,
  accountProfile: `${API_ROOT}/auth/account/profile`,
  charts: `${API_ROOT}/charts`,
  chartList: (
    query: {
      q: string
      course: string
      level?: string
      order?: string
      page: number
      owner?: string
    },
    mine = false,
  ) => withQuery(`${API_ROOT}${mine ? '/me/charts' : '/charts'}`, query),
  chart: chartPath,
  chartFiles: (id: string) => `${chartPath(id)}/files`,
  cover: (id: string, version?: string) =>
    withQuery(`${chartPath(id)}/cover`, version ? { v: version } : {}),
  leaderboard: (id: string, query: { difficulty: string; versionId: string; page: number }) =>
    withQuery(`${chartPath(id)}/leaderboard`, query),
  resource: (chart: Pick<Chart, 'id' | 'versionId'>, kind: 'audio' | 'tja' | 'download') =>
    `${chartPath(chart.id)}/versions/${encodeURIComponent(chart.versionId)}/${kind}`,
} as const
