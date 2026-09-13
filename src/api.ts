import type { Metadata } from './tja'
export type User = { id: string; username: string; emailVerified: boolean; isAdmin: boolean }
export type Locale = 'ja' | 'zh' | 'ko'
export type Session = { user: User | null; csrfToken: string }
export type Chart = Metadata & {
  id: string
  ownerId: string
  uploader: string
  versionId: string
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
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/v1${path}`, { credentials: 'include', ...init })
  const data = await response.json().catch(() => ({
    message: response.status === 413 ? '文件超过上传大小限制' : '服务响应异常，请稍后重试',
  }))
  if (!response.ok) throw new Error(data.message || '请求失败')
  return data as T
}
export function jsonRequest(method: string, body: unknown, csrf = ''): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
    body: JSON.stringify(body),
  }
}
export const resource = (chart: Chart, kind: 'audio' | 'tja' | 'download') =>
  `/api/v1/charts/${chart.id}/versions/${chart.versionId}/${kind}`
export function uploadChart(
  form: FormData,
  csrf: string,
  key: string,
  signal: AbortSignal,
  onProgress: (n: number) => void,
): Promise<Chart> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/v1/charts')
    xhr.withCredentials = true
    xhr.setRequestHeader('X-CSRF-Token', csrf)
    xhr.setRequestHeader('Idempotency-Key', key)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300) resolve(data)
        else reject(new Error(data.message || '上传失败'))
      } catch {
        reject(new Error(xhr.status === 413 ? '文件超过上传大小限制' : '服务响应异常，请重试'))
      }
    }
    xhr.onerror = () => reject(new Error('网络连接中断，请重试；同一次上传不会重复创建作品'))
    xhr.onabort = () => reject(new Error('已取消等待；若服务器已保存，重试会返回原作品'))
    xhr.ontimeout = () => reject(new Error('处理超时，请稍后重试'))
    xhr.timeout = 240000
    const abort = () => xhr.abort()
    signal.addEventListener('abort', abort, { once: true })
    xhr.onloadend = () => signal.removeEventListener('abort', abort)
    if (signal.aborted) {
      reject(new Error('已取消上传'))
      return
    }
    xhr.send(form)
  })
}
