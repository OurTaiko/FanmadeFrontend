import type { Difficulty } from './tja'

export function defaultDifficulty(difficulties: Difficulty[]): string {
  return (
    ['Oni', 'Edit', 'Hard', 'Normal', 'Easy']
      .flatMap((base) => [base, `${base}_1p`, `${base}_2p`])
      .find((course) => difficulties.some((d) => d.course === course)) ?? ''
  )
}
