import { t } from './i18n'
export const courseNames = {
  get Easy() {
    return t('messages.easy')
  },
  get Normal() {
    return t('messages.normal')
  },
  get Hard() {
    return t('messages.hard')
  },
  get Oni() {
    return t('messages.oni')
  },
  get Edit() {
    return t('messages.uraOni')
  },
} as const

export type Course = keyof typeof courseNames
export function isSupportedCourse(value: string): value is Course {
  return Object.hasOwn(courseNames, value)
}
export function supportsChart(difficulties: { course: string }[]): boolean {
  return difficulties.length > 0 && difficulties.every((d) => isSupportedCourse(d.course))
}

const tjaCourses: Record<string, Course> = {
  '0': 'Easy',
  '1': 'Normal',
  '2': 'Hard',
  '3': 'Oni',
  '4': 'Edit',
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
  oni: 'Oni',
  edit: 'Edit',
}
export function parseTjaCourse(value: string): Course | undefined {
  const key = value.trim().toLowerCase()
  return Object.hasOwn(tjaCourses, key) ? tjaCourses[key] : undefined
}
