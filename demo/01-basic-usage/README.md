# Demo: RangeLink Basic Usage

**Goal:** Showcase RangeLink's core workflow — build prompts with precise code links, paste to AI assistants, navigate back via clickable links.

**Duration:** ~62 seconds (full demo) | 30-40s (Acts 1-2 only for GIF)

**Files:** `paymentHandler.v1.ts`, `paymentHandler.v2.ts`

**Features Demonstrated:**

- Copy Range Link (auto-paste to destination)
- Copy Range Link (Clipboard Only)
- Paste Selected Text to Destination
- Smart Bind (terminal picker)
- Jump to Bound Destination
- Link navigation (click to jump back)

---

## Setup

### Window Layout

```
┌──────────────────────────────────────┐
│ paymentHandler.v1.ts (EDITOR)        │  ← Left 50%
├──────────────────────────────────────┤
│ Untitled-1 (TEXT EDITOR)             │  ← Right 50% (split view)
├──────────────────────────────────────┤
│ TERMINAL (collapsed initially)       │  ← Bottom (show when needed)
└──────────────────────────────────────┘
```

### Display Settings

1. **Theme:** Light mode (`Cmd+K Cmd+T` → "Light+ (default light)")
2. **Font size:** 16-18px (`Cmd+,` → search "font size")
3. **Line numbers:** Visible
4. **Minimap:** Hidden (`Cmd+,` → search "minimap" → disable)

### Pre-Recording Checklist

- [ ] `paymentHandler.v1.ts` open, scrolled to show lines 17-29
- [ ] `paymentHandler.v2.ts` open in another tab
- [ ] `Untitled-1` (new text file) open in split view
- [ ] Claude Code extension installed and ready
- [ ] Terminal panel available (but collapsed)
- [ ] Font size 16-18px, light theme
- [ ] Line numbers visible
- [ ] Notifications disabled
- [ ] Dock hidden (optional: `Cmd+Option+D`)

---

## Recording Script

### Act 1: Text Editor → Claude Code Extension (0:00-0:20)

#### STEP 1 [0:00-0:03]: SETUP

- Show `paymentHandler.v1.ts` open in editor
- Text editor (`Untitled-1`) visible in split view
- **Narrative:** "I'm comparing two payment implementations..."

#### STEP 2 [0:03-0:08]: BUILD PROMPT IN TEXT EDITOR

- Click into text editor (`Untitled-1`)
- Type: `Compare the error handling in these two versions:`
- **Narrative:** "I'll start my prompt in a scratch file..."

#### STEP 3 [0:08-0:12]: ADD FIRST LINK

- Switch to `paymentHandler.v1.ts`
- Select lines 18-28 (the `processPayment` try/catch block)
- `Cmd+Shift+P` → "RangeLink: Bind to Text Editor" → select `Untitled-1`
- `Cmd+Shift+P` → "RangeLink: Copy Range Link"
- Link auto-pastes to text editor
- **Narrative:** "RangeLink captures the exact code location..."

#### STEP 4 [0:12-0:17]: ADD SECOND LINK

- Switch to `paymentHandler.v2.ts`
- Select lines 26-44 (HTTP status check + improved catch block)
- `Cmd+Shift+P` → "RangeLink: Copy Range Link"
- Link auto-pastes to text editor
- **Narrative:** "...and I can reference multiple files."

#### STEP 5 [0:17-0:20]: SEND TO CLAUDE CODE EXTENSION

- Select all text in text editor (`Cmd+A`)
- `Cmd+Shift+P` → "RangeLink: Bind to Claude Code"
- `Cmd+Shift+P` → "RangeLink: Paste Selected Text to Bound Destination"
- Prompt appears in Claude Code extension panel
- **Narrative:** "Now I send this to Claude Code..."

---

### Act 2: Claude Code Extension Response (0:20-0:30)

#### STEP 6 [0:20-0:25]: COMPLETE & SUBMIT

- Click into Claude Code input
- Add to prompt: `Which approach handles edge cases better?`
- Press Enter to submit
- **Narrative:** "...and ask my question."

#### STEP 7 [0:25-0:30]: SHOW RESPONSE (brief)

- Claude starts responding
- Show 2-3 seconds of response
- **Narrative:** (none - let response speak)

---

### Act 3: Terminal Demo — Clipboard Only (0:30-0:45)

#### STEP 8 [0:30-0:35]: SWITCH TO TERMINAL

- Close Claude Code extension panel
- Open terminal panel (`Cmd+J`)
- Type: `echo "`
- **Narrative:** "Sometimes you just want the link in your clipboard..."

#### STEP 9 [0:35-0:42]: CLIPBOARD-ONLY COPY

- Switch to `paymentHandler.v1.ts`
- Select lines 17-19 (the function signature)
- `Cmd+Shift+P` → "RangeLink: Copy Range Link (Clipboard Only)"
- Show notification: "Link copied to clipboard" (no auto-paste happens)
- Switch back to terminal
- **Edit menu → Paste** (visible action, not `Cmd+V`)
- Type: `"` and press Enter
- Link prints to terminal
- **Narrative:** "...Clipboard Only skips the auto-paste."

#### STEP 10 [0:42-0:45]: CLEAR SELECTION & NAVIGATE BACK

- Click somewhere else in `paymentHandler.v1.ts` to clear selection
- Hover over link in terminal → tooltip appears
- Click the link
- File opens/scrolls with selection highlighted
- **Narrative:** "Click any link to jump back instantly."

---

### Act 4: Smart Binding Demo (0:45-0:55)

#### STEP 11 [0:45-0:50]: NEW TERMINAL + SMART BIND

- Click "+" to create new terminal (shows "zsh" or similar name)
- Previous terminal still exists
- `Cmd+Shift+P` → "RangeLink: Bind to Terminal"
- Show picker with terminal names (Terminal 1, Terminal 2)
- Select the NEW terminal (Terminal 2)
- **Narrative:** "Smart Bind remembers your destination..."

#### STEP 12 [0:50-0:55]: FINAL LINK

- Click into editor (switch focus away from terminal)
- Select code in `paymentHandler.v2.ts` (lines 35-36)
- `Cmd+Shift+P` → "RangeLink: Copy Range Link"
- Link pastes to NEW terminal (Terminal 2, not Terminal 1)
- **Narrative:** "...so links always go where you want."

---

### Act 5: Jump Feature + Close (0:55-1:02)

#### STEP 13 [0:55-0:58]: SWITCH AWAY FROM BOUND TERMINAL

- Click on Terminal 1 in the terminal tabs (the OLD terminal)
- Terminal 1 is now in foreground, Terminal 2 (bound) is in background
- **Narrative:** (none - quick action)

#### STEP 14 [0:58-1:00]: JUMP TO DESTINATION

- `Cmd+Shift+P` → "RangeLink: Jump to Bound Destination"
- Focus visibly jumps from Terminal 1 → Terminal 2
- **Narrative:** "Jump back to your destination anytime."

#### STEP 15 [1:00-1:02]: CLOSE

- Fade/cut to GitHub URL overlay
- **Text:** `github.com/couimet/rangeLink`

---

## Keybindings Demonstrated

| Keybinding    | Command                          | Where Used                  |
| ------------- | -------------------------------- | --------------------------- |
| `Cmd+R Cmd+L` | Copy Range Link                  | (shown via Command Palette) |
| `Cmd+R Cmd+C` | Copy Range Link (Clipboard Only) | Act 3                       |
| `Cmd+R Cmd+V` | Paste Selected Text              | Act 1                       |
| `Cmd+R Cmd+J` | Jump to Bound Destination        | Act 5                       |

**Post-recording:** Add text overlays showing keybindings for each action.

---

## Text Overlays / Narratives

| Time | Narrative                                               |
| ---- | ------------------------------------------------------- |
| 0:00 | "I'm comparing two payment implementations..."          |
| 0:03 | "I'll start my prompt in a scratch file..."             |
| 0:08 | "RangeLink captures the exact code location..."         |
| 0:12 | "...and I can reference multiple files."                |
| 0:17 | "Now I send this to Claude Code..."                     |
| 0:20 | "...and ask my question."                               |
| 0:30 | "Sometimes you just want the link in your clipboard..." |
| 0:35 | "...Clipboard Only skips the auto-paste."               |
| 0:42 | "Click any link to jump back instantly."                |
| 0:45 | "Smart Bind remembers your destination..."              |
| 0:50 | "...so links always go where you want."                 |
| 0:58 | "Jump back to your destination anytime."                |

---

## Post-Production

### Tools (Free/Personal)

See `demo/ASSET-STORAGE.md` for detailed tool recommendations:

- **Screen Recording:** Kap (free), OBS Studio
- **AI Voiceover:** Edge TTS (free, unlimited)
- **Video Editing:** DaVinci Resolve (free)
- **Background Music:** YouTube Audio Library (free)

### GIF Export

```bash
brew install gifski
gifski -o demo.gif --fps 15 --quality 90 --width 800 recording.mp4
```

**Target:** <5MB

### Shorter Versions

| Version            | Duration | Content                       |
| ------------------ | -------- | ----------------------------- |
| **Full (YouTube)** | ~62s     | All 5 acts                    |
| **README GIF**     | 30-40s   | Acts 1-2 only                 |
| **Twitter/social** | 15-20s   | Single file link + navigation |

---

## Troubleshooting

| Problem                          | Solution                                                                    |
| -------------------------------- | --------------------------------------------------------------------------- |
| RangeLink command not found      | Verify extension installed: `code --list-extensions \| grep rangelink`      |
| Claude Code not responding       | Check extension is running, click into input area                           |
| Link doesn't auto-paste          | Verify destination is bound (`Cmd+Shift+P` → check binding)                 |
| Video too large                  | Reduce FPS (`--fps 12`), quality (`--quality 80`), or width (`--width 700`) |
| Actions feel rushed              | Add 1-2 second pauses after each action                                     |
| Navigation highlight not visible | Clear existing selection before clicking link                               |
| Jump not visible                 | Switch away from bound terminal first                                       |
