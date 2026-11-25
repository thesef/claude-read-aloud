import { expect, test } from 'claude-code/testing'

const MENU = { plugin: 'read-aloud', surface: 'desktop', component: 'ContextMenu' } as const
const BAND = { plugin: 'read-aloud', surface: 'desktop', component: 'AbovePrompt' } as const
const settle = async () => {
  for (let i = 0; i < 50; i++) await Promise.resolve()
}

test('reads the selection sentence by sentence; skip and speed change what say runs', async ($, on) => {
  const runs: string[][] = []
  on('process.spawn', async function* (_: unknown, e: { argv: string[] }) {
    runs.push([...e.argv])
    await new Promise<void>(() => {}) // speaks "forever" until killed
    return { code: 0 }
  } as never)

  const menu = await $.ui.mount({
    ...MENU,
    props: { selection: { text: 'One **bold**. Two `x`. Three.' } },
  })
  await menu.press({ key: 'read' })
  await settle()
  expect(runs[0]).toEqual(['say', '-r', '185', 'One bold.'])

  const pane = await $.ui.mount({ ...BAND, props: {} } as never)
  await pane.press({ key: 'skip' })
  await settle()
  expect(runs.at(-1)).toEqual(['say', '-r', '185', 'Two x.'])

  await pane.press({ key: 'speed-2' })
  await settle()
  expect(runs.at(-1)).toEqual(['say', '-r', '370', 'Two x.'])

  await pane.press({ key: 'stop' })
  await settle()
  await pane.unmount()
  await menu.unmount()
})

test('no selection and nothing reading adds no row', async $ => {
  const ui = await $.ui.mount({ ...MENU, props: {} })
  expect(await ui.find({ type: 'Button' })).toBeUndefined()
  await ui.unmount()
})
