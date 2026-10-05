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

it('enforces a single chart mode and uses course suffixes for double charts', () => {
  const header = 'TITLE:D\nBPM:120\nWAVE:a.ogg\nCOURSE:Oni\nLEVEL:8\n'
  const p1 = '#START P1\n1000,\n#END\n',
    p2 = '#START P2\n2000,\n#END\n',
    single = '#START\n1000,\n#END\n'
  const parse = (body: string) =>
    parseTja(new TextEncoder().encode(header + body), 'utf-8', 'a.ogg')
  const chart = parse('STYLE:Double\n' + p2 + p1)
  expect(chart.isSingle).toBe(false)
  expect(chart.difficulties.map((d) => d.course)).toEqual(['Oni_2p', 'Oni_1p'])
  expect(parse(single).isSingle).toBe(true)
  expect(() => parse(p1 + single)).toThrow()
  expect(() => parse(p1 + p1)).toThrow()
  expect(() => parse('STYLE:Double\n' + single)).toThrow()
})
