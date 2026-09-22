import { endpoints } from '@/api/endpoints'
import type { Chart } from './api/types'

export const maxCoverBytes = 8 * 1024 * 1024
export function coverFileError(file: File): string {
  if (!/\.(jpg|png)$/i.test(file.name)) return '封面仅支持 .jpg 或 .png 文件。'
  if (!file.size || file.size > maxCoverBytes) return '封面不能为空，且不能超过 8 MiB。'
  return ''
}
export function coverSource(chart: Pick<Chart, 'id' | 'coverHash'>): string | undefined {
  return chart.coverHash ? endpoints.cover(chart.id, chart.coverHash) : undefined
}
