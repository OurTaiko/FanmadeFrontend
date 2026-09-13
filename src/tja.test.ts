import { describe, expect, it } from 'vitest'
import cases from '../contracts/validation.json'
import { parseTja, ValidationError } from './tja'

describe('shared TJA upload contract', () => {
  for (const c of cases) it(c.name, () => {
    const bytes = c.raw ? new Uint8Array(c.raw) : new TextEncoder().encode(c.text)
    if (c.code) {
      try { parseTja(bytes, c.encoding, c.audio); expect.fail('must reject invalid input') }
      catch (error) { expect(error).toBeInstanceOf(ValidationError); expect((error as ValidationError).code).toBe(c.code) }
    } else {
      const metadata = parseTja(bytes, c.encoding, c.audio)
      expect(metadata.title).toBeTruthy()
      expect(metadata.difficulties.length).toBeGreaterThan(0)
      if (c.name === 'multi difficulty') expect(metadata.difficulties.map(d => d.course)).toEqual(['Oni', 'Easy'])
    }
  })
})
