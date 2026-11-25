export type Reader = {
  sentences: string[] // the selection, split into sentences
  index: number // the sentence being read
  isPaused: boolean
  speed: number // 1, 1.25, 1.5, 2
}

declare module 'claude-code' {
  interface PluginState {
    'read-aloud': { reader: Shaped<Reader | null>; speed: number }
  }
}
