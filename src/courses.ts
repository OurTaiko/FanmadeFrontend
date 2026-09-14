export const courseNames = {
  Easy: '简单',
  Normal: '普通',
  Hard: '困难',
  Oni: '魔王',
  Edit: '里谱',
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
