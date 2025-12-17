# Quick Reference Card

Use this as a cheat sheet while recording.

## Files

| File                   | Lines to Select | What It Shows                                 |
| ---------------------- | --------------- | --------------------------------------------- |
| `paymentHandler.v1.ts` | 18-28           | Simple try/catch (basic error handling)       |
| `paymentHandler.v2.ts` | 26-44           | HTTP check + detailed catch (robust handling) |

## Pre-flight Checklist

- [ ] Both payment files open in VSCode
- [ ] `Untitled-1` (new text file) open in split view
- [ ] Claude Code extension ready
- [ ] Terminal panel available (collapsed)
- [ ] **Light theme enabled** ("Light+ (default light)")
- [ ] Font size 16-18px
- [ ] Line numbers visible
- [ ] Recording tool ready (Kap, OBS, or built-in)
- [ ] Notifications disabled
- [ ] Dock hidden (optional)

---

## The Demo Flow

### Act 1: Text Editor → Claude Code (0:00-0:20)

| Step | Time | Action                   | Command                                                   |
| ---- | ---- | ------------------------ | --------------------------------------------------------- |
| 1    | 0:00 | Setup visible            | —                                                         |
| 2    | 0:03 | Type in Untitled-1       | `Compare the error handling in these two versions:`       |
| 3    | 0:08 | Select v1 lines 18-28    | `Cmd+Shift+P` → Bind to Text Editor → Copy Range Link     |
| 4    | 0:12 | Select v2 lines 26-44    | `Cmd+Shift+P` → Copy Range Link                           |
| 5    | 0:17 | Select all in Untitled-1 | `Cmd+Shift+P` → Bind to Claude Code → Paste Selected Text |

### Act 2: Claude Response (0:20-0:30)

| Step | Time | Action                                                    |
| ---- | ---- | --------------------------------------------------------- |
| 6    | 0:20 | Type: `Which approach handles edge cases better?` → Enter |
| 7    | 0:25 | Show Claude responding (2-3 seconds)                      |

### Act 3: Clipboard Only (0:30-0:45)

| Step | Time | Action                                     | Command                                          |
| ---- | ---- | ------------------------------------------ | ------------------------------------------------ |
| 8    | 0:30 | Close Claude, open terminal, type `echo "` | `Cmd+J`                                          |
| 9    | 0:35 | Select v1 lines 17-19                      | `Cmd+Shift+P` → Copy Range Link (Clipboard Only) |
| —    | —    | **Edit menu → Paste** (not Cmd+V!)         | —                                                |
| —    | —    | Type `"` and Enter                         | —                                                |
| 10   | 0:42 | Clear selection, hover link, click         | Link navigates back                              |

### Act 4: Smart Binding (0:45-0:55)

| Step | Time | Action                     | Command                                                |
| ---- | ---- | -------------------------- | ------------------------------------------------------ |
| 11   | 0:45 | Click "+" for new terminal | `Cmd+Shift+P` → Bind to Terminal → select Terminal 2   |
| 12   | 0:50 | Select v2 lines 35-36      | `Cmd+Shift+P` → Copy Range Link → pastes to Terminal 2 |

### Act 5: Jump + Close (0:55-1:02)

| Step | Time | Action               | Command                                   |
| ---- | ---- | -------------------- | ----------------------------------------- |
| 13   | 0:55 | Click Terminal 1 tab | (switch away from bound terminal)         |
| 14   | 0:58 | Jump to destination  | `Cmd+Shift+P` → Jump to Bound Destination |
| 15   | 1:00 | Fade to GitHub URL   | `github.com/couimet/rangeLink`            |

---

## Exact Text to Type

**In Untitled-1 (Step 2):**

```
Compare the error handling in these two versions:
```

**In Claude Code (Step 6):**

```
Which approach handles edge cases better?
```

**In Terminal (Step 8):**

```
echo "
```

---

## Key Commands (via Command Palette)

| Action                | Command Palette Search                                |
| --------------------- | ----------------------------------------------------- |
| Bind to Text Editor   | `RangeLink: Bind to Text Editor`                      |
| Bind to Claude Code   | `RangeLink: Bind to Claude Code`                      |
| Bind to Terminal      | `RangeLink: Bind to Terminal`                         |
| Copy Range Link       | `RangeLink: Copy Range Link`                          |
| Copy (Clipboard Only) | `RangeLink: Copy Range Link (Clipboard Only)`         |
| Paste Selected Text   | `RangeLink: Paste Selected Text to Bound Destination` |
| Jump to Destination   | `RangeLink: Jump to Bound Destination`                |

---

## Keybindings (for post-recording overlays)

| Keybinding    | Command                          |
| ------------- | -------------------------------- |
| `Cmd+R Cmd+L` | Copy Range Link                  |
| `Cmd+R Cmd+C` | Copy Range Link (Clipboard Only) |
| `Cmd+R Cmd+V` | Paste Selected Text              |
| `Cmd+R Cmd+J` | Jump to Bound Destination        |

---

## Timing Targets

| Act | Duration  | Content                                |
| --- | --------- | -------------------------------------- |
| 1   | 0:00-0:20 | Build prompt in text editor, add links |
| 2   | 0:20-0:30 | Claude Code response                   |
| 3   | 0:30-0:45 | Clipboard Only + navigation            |
| 4   | 0:45-0:55 | Smart Binding with 2 terminals         |
| 5   | 0:55-1:02 | Jump feature + close                   |

**Total: ~62 seconds**

---

## Critical Reminders

1. **Before navigation demo (Step 10):** Clear the selection first!
2. **Before jump demo (Step 14):** Switch to Terminal 1 first!
3. **For Clipboard Only (Step 9):** Use **Edit menu → Paste**, not `Cmd+V`
4. **Pause 1-2 seconds** after each major action
