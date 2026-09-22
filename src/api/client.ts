import { endpoints } from './endpoints'
import type { Chart } from './types'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly retryAfter = 0,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
export async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { credentials: 'include', ...init })
  const data = await response.json().catch(() => ({
    message: response.status === 413 ? '文件超过上传大小限制' : '服务响应异常，请稍后重试',
  }))
  if (!response.ok)
    throw new ApiError(data.message || '请求失败', Number(response.headers.get('Retry-After')) || 0)
  return data as T
}
export function jsonRequest(method: string, body: unknown, csrf = ''): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
    body: JSON.stringify(body),
  }
}
export function uploadChart(
  form: FormData,
  csrf: string,
  key: string,
  signal: AbortSignal,
  onProgress: (n: number) => void,
  replaceChartId?: string,
): Promise<Chart> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(
      replaceChartId ? 'PUT' : 'POST',
      replaceChartId ? endpoints.chartFiles(replaceChartId) : endpoints.charts,
    )
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
    xhr.onerror = () => reject(new Error('网络连接中断，请重试；同一次请求不会重复保存'))
    xhr.onabort = () => reject(new Error('已取消等待；若服务器已保存，重试会返回已保存的作品'))
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
