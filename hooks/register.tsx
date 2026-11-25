import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Reader } from '../types'

// ───────── Settings (edit these) ─────────
// Words per minute at 1x. Speech uses the System Voice from System Settings →
// Accessibility → Spoken Content (currently Siri).
const BASE_RATE = 185
const SPEEDS = [1, 1.25, 1.5, 2]
// ─────────────────────────────────────────

const reader = atom({ plugin: 'read-aloud', key: 'reader' } as const, null, {
  shape: 'reader-1',
})
const speedPref = atom({ plugin: 'read-aloud', key: 'speed' } as const, 1)

// The running `say` process; returning its stream kills it.
let current: AsyncIterator<unknown> | undefined
let runId = 0 // bumps on every start/skip/stop so stale loops end

// Turn markdown into plain speech: no backticks, stars, hashes or link URLs.
export const clean = (text: string) =>
  text
    .replace(/```[\s\S]*?```/g, ' code block. ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*_#>|]/g, '')
    .replace(/https?:\/\/\S+/g, 'link')
    .replace(/[ \t]+/g, ' ')
    .trim()

// Split into sentences (and lines), so Skip and Back move one at a time.
export const split = (text: string) =>
  clean(text)
    .split(/(?<=[.!?…:])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => /\w/.test(s))

type $ = EngineInterface

const kill = async () => {
  const it = current
  current = undefined
  void it?.return?.(undefined)?.catch?.(() => {})
}

// Reads from the reader's current sentence to the end, unless something
// newer (skip, back, pause, speed, stop) takes over.
const play = async ($: $) => {
  const id = ++runId
  await kill()
  for (;;) {
    const r = await read($, reader)
    if (!r || r.isPaused || id !== runId) return
    if (r.index >= r.sentences.length) {
      await finish($)
      return
    }
    const rate = String(Math.round(BASE_RATE * r.speed))
    const stream = $.process.spawn({ argv: ['say', '-r', rate, r.sentences[r.index] ?? ''] })
    current = stream
    try {
      for await (const _ of stream) {
        // say writes nothing; the loop lasts as long as the speech
      }
    } catch {
      // killed or failed: fall through
    }
    if (id !== runId) return
    await update($, reader, s => (s ? { ...s, index: s.index + 1 } : s))
  }
}

const finish = async ($: $) => {
  runId++
  await kill()
  await update($, reader, () => null)
}

const start = async ($: $, text: string) => {
  const sentences = split(text)
  if (sentences.length === 0) return
  const speed = await read($, speedPref)
  await update($, reader, () => ({ sentences, index: 0, isPaused: false, speed }))
  void play($)
}

const jump = async ($: $, by: number) => {
  await update($, reader, s =>
    s ? { ...s, index: Math.min(Math.max(0, s.index + by), s.sentences.length - 1) } : s,
  )
  const r = await read($, reader)
  if (r && !r.isPaused) void play($)
}

const togglePause = async ($: $) => {
  const r = await read($, reader)
  if (!r) return
  if (r.isPaused) {
    await update($, reader, s => (s ? { ...s, isPaused: false } : s))
    void play($)
  } else {
    runId++
    await kill()
    await update($, reader, s => (s ? { ...s, isPaused: true } : s))
  }
}

const setSpeed = async ($: $, speed: number) => {
  await update($, speedPref, () => speed)
  await update($, reader, s => (s ? { ...s, speed } : s))
  const r = await read($, reader)
  if (r && !r.isPaused) void play($) // restart this sentence at the new speed
}

const label = (n: number) => `${n}x`

export const register: Register = on => {
  on('ui.render', { component: 'ContextMenu' }, async ($, e, next) => {
    const selected = e.props.selection?.text?.trim()
    const r = await read($, reader)
    if (!selected && !r) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        {selected && (
          <Button key="read" onPress={() => void start($, selected)}>
            Read aloud <Text dimColor>Only the selected text</Text>
          </Button>
        )}
        {r && (
          <Button key="stop" onPress={() => void finish($)}>
            Stop reading
          </Button>
        )}
      </Box>
    )
  })

  // The player, in the band right above the message box, while reading.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const r = await read($, reader)
    if (!r) return next(e)
    const { Box, Button, Text } = $.ui.resolve(e)

    const at = Math.min(r.index, r.sentences.length - 1)
    return (
      <Box flexDirection="column">
        <Text dimColor>
          🔊 {r.isPaused ? 'Paused' : 'Reading'} · {at + 1} of {r.sentences.length} · {label(r.speed)} — {r.sentences[at]}
        </Text>
        <Box flexDirection="row" gap={1}>
          <Button key="back" onPress={() => void jump($, -1)}>⏮ Back</Button>
          <Button key="pause" onPress={() => void togglePause($)}>
            {r.isPaused ? '▶ Play' : '⏸ Pause'}
          </Button>
          <Button key="skip" onPress={() => void jump($, 1)}>Skip ⏭</Button>
          <Button key="stop" onPress={() => void finish($)}>■ Stop</Button>
          {SPEEDS.map(s => (
            <Button key={`speed-${s}`} dimColor={s !== r.speed} onPress={() => void setSpeed($, s)}>
              {label(s)}
            </Button>
          ))}
        </Box>
      </Box>
    )
  })

}
