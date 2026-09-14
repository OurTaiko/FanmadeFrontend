import type { Difficulty } from './tja'

export function defaultDifficulty(difficulties: Difficulty[]): string {
  return (
    ['Oni', 'Edit', 'Hard', 'Normal', 'Easy'].find((course) =>
      difficulties.some((d) => d.course === course),
    ) ??
    difficulties[0]?.course ??
    ''
  )
}
