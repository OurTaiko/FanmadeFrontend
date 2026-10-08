import { t } from './i18n'
import type { Difficulty } from './tja'
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

// A double chart's P1 and P2 blocks of one course are one chart for display;
// scores and leaderboards stay per side, since two people may play them.
export type CourseGroup = { base: BaseCourse; double: boolean; sides: Difficulty[] }
export function groupCourses(difficulties: Difficulty[]): CourseGroup[] {
  const groups: CourseGroup[] = []
  for (const d of difficulties) {
    if (!isSupportedCourse(d.course)) continue
    const base = baseCourse(d.course)
    let group = groups.find((g) => g.base === base)
    if (!group) groups.push((group = { base, double: d.course !== base, sides: [] }))
    if (!group.sides.some((side) => side.course === d.course)) group.sides.push(d)
  }
  for (const group of groups) group.sides.sort((a, b) => a.course.localeCompare(b.course))
  return groups
}
export function groupName(group: CourseGroup): string {
  return group.double
    ? t('messages.doubleCourse', { course: baseNames[group.base] })
    : baseNames[group.base]
}
// "3" when every side has the same level, otherwise "3/4" in P1/P2 order.
export function groupLevel(group: CourseGroup): string {
  return [...new Set(group.sides.map((side) => side.level))].join('/')
}
