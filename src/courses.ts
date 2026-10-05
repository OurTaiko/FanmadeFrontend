import { t } from './i18n'
const baseNames = {
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

export type BaseCourse = keyof typeof baseNames
export type Course = BaseCourse | `${BaseCourse}_1p` | `${BaseCourse}_2p`
export const courseNames = {} as Record<Course, string>
for (const base of Object.keys(baseNames) as BaseCourse[]) {
  for (const suffix of ['', '_1p', '_2p'] as const) {
    Object.defineProperty(courseNames, `${base}${suffix}`, {
      enumerable: true,
      get: () => `${baseNames[base]}${suffix ? ' ' + suffix.slice(1).toUpperCase() : ''}`,
    })
  }
}
export function baseCourse(value: string): BaseCourse {
  return value.replace(/_[12]p$/, '') as BaseCourse
}
export function isSupportedCourse(value: string): value is Course {
  return Object.hasOwn(courseNames, value)
}
export function supportsChart(difficulties: { course: string }[]): boolean {
  return difficulties.length > 0 && difficulties.every((d) => isSupportedCourse(d.course))
}

const tjaCourses: Record<string, BaseCourse> = {
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
export function parseTjaCourse(value: string): BaseCourse | undefined {
  const key = value.trim().toLowerCase()
  return Object.hasOwn(tjaCourses, key) ? tjaCourses[key] : undefined
}
