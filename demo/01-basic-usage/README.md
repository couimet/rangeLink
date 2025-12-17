# Demo: Basic RangeLink Usage

**Goal:** Show RangeLink's core workflow—highlight code, generate link, paste into AI assistant, navigate back.

**Duration:** 40-45 seconds

**Files:** `calculateDiscount.ts` (primary), `ShoppingCart.tsx` (for navigation demo)

---

## Setup

### Window Layout

```
┌──────────────────────────────────────┐
│ calculateDiscount.ts (EDITOR)        │  ← Top 60%
│ [Scrolled to show lines 21-44]       │
├──────────────────────────────────────┤
│ TERMINAL (Claude Code running)       │  ← Bottom 40%
│ › [cursor blinking]                  │
└──────────────────────────────────────┘
```

### Display Settings

1. **Theme:** Light mode (`Cmd+K Cmd+T` → "Light+ (default light)")
2. **Font size:** 16-18px (`Cmd+,` → search "font size")
3. **Line numbers:** Visible
4. **Minimap:** Hidden (`Cmd+,` → search "minimap" → disable)

### Pre-Recording Checklist

- [ ] `calculateDiscount.ts` open, scrolled to show lines 21-44
- [ ] `ShoppingCart.tsx` open in another tab
- [ ] Claude Code running in terminal
- [ ] Font size 16-18px, light theme
- [ ] Line numbers visible
- [ ] Notifications disabled
- [ ] Dock hidden (optional: `Cmd+Option+D`)

---

## Recording Script

### [0:00-0:05] Setup

- VSCode visible with `calculateDiscount.ts` open
- Terminal with Claude Code below
- Cursor idle

### [0:05-0:10] Part 1: Set Context

- Click into terminal
- Type:
  ```
  I'm reviewing the discount logic in the shopping cart.
  ```
- Press Enter

### [0:10-0:18] Part 2: Generate RangeLink

- Click into editor
- Highlight lines 21-44 (the `calculateDiscount` function)
- `Cmd+Shift+P` → type "RangeLink"
- Select "RangeLink: Copy RangeLink to Clipboard"
- Click into terminal
- Paste (`Cmd+V`)
- **Pause 2 seconds** — let viewers see the link format

### [0:18-0:25] Part 3: Complete Question

- Press Enter
- Type:
  ```
  How does this handle edge cases when the cart subtotal is exactly at the minPurchase threshold?
  ```
- **Pause 2 seconds**

### [0:25-0:30] Submit

- Press Enter
- Claude Code starts processing
- Optional: capture first 2-3 seconds of response

### [0:30-0:40] Navigation Demo

- `Cmd+W` to close `calculateDiscount.ts`
- Hover over RangeLink in terminal → tooltip appears
- **Pause 2 seconds**
- Click the RangeLink
- `calculateDiscount.ts` opens with lines 21-44 highlighted

### [0:40-0:45] Closing

- Fade to black (or stay on screen)
- Text overlay:
  ```
  RangeLink for VSCode
  github.com/couimet/rangeLink
  ```

---

## The Prompt

**What appears in terminal:**

```
I'm reviewing the discount logic in the shopping cart.

vscode://file/.../calculateDiscount.ts:21:1-44:3

How does this handle edge cases when the cart subtotal is exactly at the minPurchase threshold?
```

### Alternative Prompts

| Lines | Context                                                         | Question                                                                |
| ----- | --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 21-44 | "The ShoppingCart component is calling this discount function." | "Should we add validation before passing the subtotal here?"            |
| 25-28 | "Users are reporting that discounts aren't applying correctly." | "Could this minPurchase check be causing issues with zero-value carts?" |

---

## Text Overlays (Optional)

| Time | Text                      |
| ---- | ------------------------- |
| 0:05 | "Set context"             |
| 0:10 | "Reference specific code" |
| 0:18 | "Complete your question"  |
| 0:30 | "Navigate back anytime"   |

---

## Post-Production

### GIF Export

```bash
brew install gifski
gifski -o demo.gif --fps 15 --quality 90 --width 800 recording.mp4
```

**Target:** <5MB

### If too large

- Reduce FPS: `--fps 12`
- Reduce quality: `--quality 80`
- Reduce width: `--width 700`

---

## Troubleshooting

| Problem                     | Solution                                                               |
| --------------------------- | ---------------------------------------------------------------------- |
| RangeLink command not found | Verify extension installed: `code --list-extensions \| grep rangelink` |
| Claude Code not responding  | Check terminal is focused, Claude Code is running                      |
| Video too large             | Reduce FPS, quality, or width (see above)                              |
| Actions feel rushed         | Add 1-2 second pauses after each action                                |

---

## Key Moments to Emphasize

1. **Three-part prompt structure** — context, link, question
2. **The link format** — pause so viewers see the URI structure
3. **Hover tooltip** — clearly show the preview
4. **Navigation click** — emphasize "jump back" functionality
