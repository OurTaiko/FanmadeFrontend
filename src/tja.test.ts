import { describe, expect, it } from 'vitest'
import cases from '../contracts/validation.json'
import { parseTja, ValidationError } from './tja'

describe('shared TJA upload contract', () => {
  for (const c of cases)
    it(c.name, () => {
      const bytes = c.raw ? new Uint8Array(c.raw) : new TextEncoder().encode(c.text)
      if (c.code) {
        try {
          parseTja(bytes, c.encoding, c.audio)
          expect.fail('must reject invalid input')
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError)
          expect((error as ValidationError).code).toBe(c.code)
          if (c.line) expect((error as ValidationError).line).toBe(c.line)
        }
      } else {
        const metadata = parseTja(bytes, c.encoding, c.audio)
        expect(metadata.title).toBeTruthy()
        expect(metadata.difficulties.length).toBeGreaterThan(0)
        if (c.name === 'multi difficulty')
          expect(metadata.difficulties.map((d) => d.course)).toEqual(['Oni', 'Easy'])
      }
    })
})

it('defaults every difficulty to the scanned MAKER', () => {
  const text =
    'TITLE:Maker test\nMAKER:A\nBPM:120\nWAVE:test.ogg\n' +
    ['Hard', 'Oni', 'Edit']
      .map((course) => `COURSE:${course}\nLEVEL:5\n#START\n1000,\n#END\n`)
      .join('')
  const metadata = parseTja(new TextEncoder().encode(text), 'utf-8', 'test.ogg')
  expect(metadata.difficulties.map((d) => d.maker)).toEqual(['A', 'A', 'A'])
  const blank = parseTja(
    new TextEncoder().encode(text.replace('MAKER:A\n', '')),
    'utf-8',
    'test.ogg',
  )
  expect(blank.difficulties.map((d) => d.maker)).toEqual(['', '', ''])
})
