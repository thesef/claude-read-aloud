# read-aloud

Select text in the Claude desktop chat, right-click, and choose **Read aloud** to hear only that selection. Markdown symbols, code fences and link addresses are cleaned out first.

While it reads, a player bar appears right above the message box, showing the current sentence with controls:
- **⏮ Back / Skip ⏭**: move one sentence.
- **⏸ Pause / ▶ Play**.
- **■ Stop**. 
- **1x · 1.25x · 1.5x · 2x**: the speed you pick is remembered for next time.

It speaks with the System Voice set in System Settings → Accessibility → Spoken Content (Siri voices work), through macOS `say`. Change `BASE_RATE` (words per minute at 1x) or `SPEEDS` at the top of `hooks/register.tsx`.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install read-aloud --marketplace thesef/claude-read-aloud
```

Answer `y` to add the marketplace, then pick a scope (user is first).

From a shell:

```bash
claude plugin install read-aloud --marketplace thesef/claude-read-aloud
```

In the Claude desktop app, where `/plugin` does not run: click **+** next to the prompt box → **Plugins** → **Add marketplace** with `thesef/claude-read-aloud`, then **Add plugin**.

Requires macOS (it speaks with `say`).
