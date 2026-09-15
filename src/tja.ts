import { parseTjaCourse } from './courses'
import { normalizeTja } from './tja-encoding'
import { ValidationError } from './validation-error'
export { ValidationError } from './validation-error'

export const validationVersion = 'tja-upload-v6'
export const maxTja = 2 * 1024 * 1024
export const maxAudio = 100 * 1024 * 1024
export type Difficulty = {
  course: string
  level: number
  blockIndex: number
  player: string
  maker: string
}
export type Metadata = {
  title: string
  subtitle: string
  maker: string
  bpm: number
  offset: number
  demoStart: number
  wave: string
  difficulties: Difficulty[]
}
const fail = (code: string, message: string, line = 0): never => {
  throw new ValidationError(code, message, line)
}
const bytes = (s: string) => new TextEncoder().encode(s).length
export const isAudioFilename = (name: string) => /\.(ogg|mp3)$/i.test(name)

async function validateAudioHeader(audio: File) {
  const header = new Uint8Array(await audio.slice(0, 10).arrayBuffer())
  if (/\.ogg$/i.test(audio.name)) {
    if (new TextDecoder().decode(header.slice(0, 4)) !== 'OggS')
      fail('AUDIO_INVALID', '音频不是有效 Ogg 文件，请检查实际格式')
    return
  }
  const id3 =
    header.length === 10 &&
    new TextDecoder().decode(header.slice(0, 3)) === 'ID3' &&
    header[3] >= 2 &&
    header[3] <= 4 &&
    header[4] !== 255 &&
    header.slice(6, 10).every((b) => b < 128)
  if (id3) {
    const tagSize = header.slice(6, 10).reduce((size, b) => size * 128 + b, 0)
    const footer = header[3] === 4 && (header[5] & 16) !== 0 ? 10 : 0
    if (10 + tagSize + footer + 4 <= audio.size) return
  } else if (
    header.length >= 4 &&
    header[0] === 255 &&
    (header[1] & 224) === 224 &&
    ((header[1] >> 3) & 3) !== 1 &&
    ((header[1] >> 1) & 3) === 1 &&
    header[2] >> 4 > 0 &&
    header[2] >> 4 < 15 &&
    ((header[2] >> 2) & 3) !== 3
  )
    return
  // This is a lightweight signature check. The backend validates all frames and decodes the file.
  fail('AUDIO_INVALID', '音频不是有效 MP3 文件，请检查实际格式，不要只修改扩展名')
}

export function safeFilename(s: string) {
  return (
    !!s &&
    s !== '.' &&
    s !== '..' &&
    bytes(s) <= 240 &&
    s.trim() === s &&
    !Array.from(s).some((c) => {
      const n = c.codePointAt(0)!
      return n < 32 || (n >= 127 && n <= 159)
    }) &&
    !/[/\\:"<>|?*]/u.test(s)
  )
}
export function parseTja(data: Uint8Array, encoding: string, audioName: string): Metadata {
  const m: Metadata = {
    title: '',
    subtitle: '',
    maker: '',
    bpm: 0,
    offset: 0,
    demoStart: 0,
    wave: '',
    difficulties: [],
  }
  if (!data.length || data.length > maxTja)
    fail('FILE_SIZE_INVALID', 'TJA 不能为空且不能超过 2 MiB')
  if (!['utf-8', 'shift-jis'].includes(encoding)) fail('TJA_ENCODING_INVALID', '不支持此文本编码')
  let text = ''
  try {
    text = new TextDecoder(encoding === 'shift-jis' ? 'shift_jis' : 'utf-8', { fatal: true })
      .decode(data)
      .replace(/^\uFEFF/, '')
  } catch {
    fail('TJA_ENCODING_INVALID', '无法解码文本，请转存为 UTF-8 后重新选择')
  }
  if (text.includes('\uFFFD') || text.includes('\u0000'))
    fail('TJA_ENCODING_INVALID', '文本包含无法识别的字符')
  let waveLine = 0,
    waves = 0,
    started = false,
    inBlock = false,
    hasNotes = false,
    course = 'Oni',
    level = 0
  const seen = new Set<string>()
  for (const [index, raw] of text.replace(/\r\n/g, '\n').split('\n').entries()) {
    const line = index + 1
    if (bytes(raw) > 65536) fail('TJA_STRUCTURE_INVALID', '单行内容超过 64 KiB', line)
    const s = raw.split('//', 1)[0].trim()
    if (!s) continue
    if (s.startsWith('#NEXTSONG'))
      fail('TJA_RESOURCE_UNSUPPORTED', '示范版暂不支持切歌或额外资源', line)
    if (s.startsWith('#START')) {
      if (!['#START', '#START P1', '#START P2'].includes(s) || inBlock || level === 0)
        fail('TJA_STRUCTURE_INVALID', '每个谱面需要 LEVEL:1–10 和独立的 #START / #END', line)
      started = true
      inBlock = true
      hasNotes = false
      m.difficulties.push({
        course,
        level,
        maker: m.maker,
        blockIndex: m.difficulties.length,
        player: s.slice(6).trim(),
      })
      continue
    }
    if (s === '#END') {
      if (!inBlock || !hasNotes)
        fail('TJA_STRUCTURE_INVALID', '谱面块为空或 #END 没有对应的 #START', line)
      inBlock = false
      continue
    }
    const colon = s.indexOf(':')
    if (colon < 0) {
      if (inBlock && !s.startsWith('#') && /[0-9]/.test(s)) hasNotes = true
      continue
    }
    const key = s.slice(0, colon).trim(),
      value = s.slice(colon + 1).trim(),
      upper = key.toUpperCase()
    if (upper === 'WAVE') {
      if (key !== 'WAVE') fail('TJA_WAVE_INVALID', '请使用大写 WAVE:', line)
      waves++
      if (waves > 1) fail('TJA_WAVE_DUPLICATE', '只能声明一次 WAVE', line)
      if (started) fail('TJA_WAVE_SCOPE_INVALID', 'WAVE 必须位于第一个 #START 之前', line)
      waveLine = line
      m.wave = value
      continue
    }
    if (['LYRICS', 'BGIMAGE', 'BGMOVIE'].includes(upper) && value)
      fail('TJA_RESOURCE_UNSUPPORTED', '仅接受 TJA 与单个 OGG 或 MP3 音频', line)
    if (upper === 'COURSE') {
      if (['tower', 'dan', '5', '6'].includes(value.toLowerCase()))
        fail(
          'TJA_COURSE_UNSUPPORTED',
          '不支持塔（Tower）或段位（Dan）谱面，请移除这些谱面块后重新上传',
          line,
        )
      const parsed = parseTjaCourse(value)
      if (!parsed || inBlock || key !== 'COURSE')
        fail(
          'TJA_STRUCTURE_INVALID',
          '请使用大写 COURSE，难度需要 Easy / Normal / Hard / Oni / Edit（或 0–4）',
          line,
        )
      course = parsed!
      level = 0
      continue
    }
    if (key === 'LEVEL') {
      const n = Number(value)
      if (!/^[+-]?[0-9]+$/.test(value) || !Number.isInteger(n) || n < 1 || n > 10 || inBlock)
        fail('TJA_STRUCTURE_INVALID', 'LEVEL 必须是 1–10 的整数', line)
      level = n
      continue
    }
    if (['TITLE', 'SUBTITLE', 'MAKER', 'BPM', 'OFFSET', 'DEMOSTART'].includes(key)) {
      if (started || seen.has(key))
        fail('TJA_STRUCTURE_INVALID', `${key} 必须在谱面开始前且只声明一次`, line)
      seen.add(key)
      if (bytes(value) > 500) fail('TJA_STRUCTURE_INVALID', '元数据字段过长', line)
      switch (key) {
        case 'TITLE':
          m.title = value
          break
        case 'SUBTITLE':
          m.subtitle = value
          break
        case 'MAKER':
          m.maker = value
          break
        default: {
          const n = Number(value)
          if (!/^[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)$/.test(value) || !Number.isFinite(n))
            fail('TJA_STRUCTURE_INVALID', `${key} 必须为有限数字`, line)
          if (key === 'BPM') m.bpm = n
          if (key === 'OFFSET') m.offset = n
          if (key === 'DEMOSTART') m.demoStart = n
        }
      }
    }
  }
  if (!waves || !m.wave) fail('TJA_WAVE_MISSING', 'TJA 缺少非空的 WAVE 音频引用', waveLine)
  if (!safeFilename(m.wave) || !isAudioFilename(m.wave))
    fail('TJA_WAVE_PATH_INVALID', 'WAVE 必须为不带路径、引号的 .ogg 或 .mp3 文件名', waveLine)
  if (!safeFilename(audioName)) fail('UPLOAD_FILENAME_INVALID', '上传文件名不能包含路径或特殊字符')
  if (m.wave.normalize('NFC') !== audioName.normalize('NFC'))
    throw new ValidationError(
      'TJA_AUDIO_MISMATCH',
      `第 ${waveLine} 行引用了「${m.wave}」，但你选择的是「${audioName}」。请选择对应文件，或修改 TJA 的 WAVE 后重新选择。`,
      waveLine,
      m.wave,
      audioName,
    )
  if (!m.title || m.bpm <= 0 || inBlock || !m.difficulties.length)
    fail('TJA_STRUCTURE_INVALID', '需要 TITLE、正数 BPM 和完整谱面块')
  return m
}
export type PreparedTja = Metadata & { file: File; sourceEncoding: string }
export async function validateFiles(tja: File, audio: File): Promise<PreparedTja> {
  if (!safeFilename(tja.name) || !/\.tja$/i.test(tja.name) || !isAudioFilename(audio.name))
    fail('UPLOAD_FILES_INVALID', '请选择一个 .tja 谱面和一个 .ogg 或 .mp3 音频')
  if (!tja.size || tja.size > maxTja || !audio.size || audio.size > maxAudio)
    fail('FILE_SIZE_INVALID', '文件不能为空；TJA 最大 2 MiB，音频最大 100 MiB')
  const normalized = await normalizeTja(new Uint8Array(await tja.arrayBuffer()), audio.name)
  const metadata = parseTja(normalized.data, 'utf-8', audio.name)
  await validateAudioHeader(audio)
  return {
    ...metadata,
    sourceEncoding: normalized.sourceEncoding,
    file: new File([normalized.data], tja.name, { type: 'text/plain;charset=utf-8' }),
  }
}
