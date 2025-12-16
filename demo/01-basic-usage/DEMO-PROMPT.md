# Demo Prompt Structure

This file contains the prompt structure for demonstrating RangeLink in a realistic scenario.

## Demo Flow

### 1. Open Files
- Open `calculateDiscount.ts` first
- Have `ShoppingCart.tsx` available to switch to

### 2. Recording Scenario

**Part A: Set context** (Type/paste this first)
```
I'm reviewing the discount logic in the shopping cart.
```

**Part B: Generate RangeLink** (Use extension)
- Highlight lines 20-42 in `calculateDiscount.ts` (the `calculateDiscount` function)
- Use Command Palette: `Cmd+Shift+P` → "RangeLink: Copy RangeLink to Clipboard"
- Paste into terminal (the RangeLink appears)

**Part C: Complete the prompt** (Continue typing)
```
How does this handle edge cases when the cart subtotal is exactly at the minPurchase threshold?
```

### 3. Navigation Demo

**Switch files to show navigation:**
1. Close `calculateDiscount.ts` (or switch to `ShoppingCart.tsx`)
2. Hover over the RangeLink in the terminal (should show tooltip with file path and preview)
3. Click the RangeLink (or Cmd+Click)
4. VSCode should open `calculateDiscount.ts` and highlight lines 20-42

---

## Full Prompt (What appears in terminal)

```
I'm reviewing the discount logic in the shopping cart.

vscode://file//Users/couimet/Shopify/src-outside/rangeLink/demo/vscode-extension/01-basic-usage/calculateDiscount.ts:20:1-42:3

How does this handle edge cases when the cart subtotal is exactly at the minPurchase threshold?
```

---

## Alternative Prompts

### Option 1: Cross-file reference
**Context:**
```
The ShoppingCart component is calling this discount function.
```

**After RangeLink (lines 20-42 in calculateDiscount.ts):**
```
Should we add validation before passing the subtotal here?
```

### Option 2: Bug investigation
**Context:**
```
Users are reporting that discounts aren't applying correctly.
```

**After RangeLink (lines 24-27 in calculateDiscount.ts):**
```
Could this minPurchase check be causing issues with zero-value carts?
```

### Option 3: Performance question
**Context:**
```
Looking at optimization opportunities in the checkout flow.
```

**After RangeLink (lines 48-50 in calculateDiscount.ts):**
```
This subtotal calculation runs on every cart update. Should we memoize it?
```

---

## Demo Script with Timing

### [0:00-0:05] Setup
- VSCode open with `calculateDiscount.ts` visible
- Terminal with Claude Code running below
- File scrolled to show the `calculateDiscount` function

### [0:05-0:10] Context (Part 1)
- Click into terminal
- Type: "I'm reviewing the discount logic in the shopping cart."
- Press Enter to move to new line

### [0:10-0:18] Generate RangeLink (Part 2)
- Click back into editor
- Highlight lines 20-42 (the `calculateDiscount` function)
- `Cmd+Shift+P` → Type "RangeLink"
- Select "RangeLink: Copy RangeLink to Clipboard"
- Click into terminal
- Paste (Cmd+V) - the RangeLink appears

### [0:18-0:25] Complete Prompt (Part 3)
- Press Enter to move to new line
- Type: "How does this handle edge cases when the cart subtotal is exactly at the minPurchase threshold?"
- Pause for 2 seconds (let viewers see the full prompt)

### [0:25-0:30] Submit
- Press Enter (Claude starts processing)
- Optional: Show first few lines of Claude's response

### [0:30-0:40] Navigation Demo
- `Cmd+W` to close `calculateDiscount.ts`
- Now `ShoppingCart.tsx` is visible (or empty editor)
- In terminal, hover over the RangeLink
- Tooltip appears showing file path and preview
- Click (or Cmd+Click) the RangeLink
- `calculateDiscount.ts` opens with lines 20-42 highlighted

### [0:40-0:45] Closing
- Fade to black with text:
  ```
  RangeLink for VSCode
  Precise code context, effortless navigation
  github.com/Shopify/rangeLink
  ```

---

## Visual Highlights

**Key moments to emphasize:**

1. **Three-part prompt structure** - Show that RangeLink integrates naturally into conversation
2. **The generated link format** - Pause so viewers see the URI structure
3. **Hover tooltip** - Clearly show the preview when hovering over link
4. **Navigation** - Emphasize the "jump back" functionality

**Text overlays (optional):**

- [0:05] "Set context"
- [0:10] "Reference specific code"
- [0:18] "Complete your question"
- [0:30] "Navigate back anytime"

---

## Tips for Recording

### Natural Flow
- Don't rush between sections
- The three-part structure should feel conversational
- Pause after pasting the RangeLink (let viewers absorb the format)

### Highlight Navigation
- The hover tooltip is a key feature - make sure it's visible
- Ensure cursor is clearly visible when hovering
- Click deliberately (not too fast)

### Terminal Visibility
- Make sure terminal font is large enough to read the full RangeLink
- Consider zooming in when the link is pasted
- The terminal should show ~5-10 lines of history

### File Switching
- Close the first file completely (or switch tabs)
- This makes the navigation demo more impressive
- Shows that RangeLink is a persistent reference, not just a highlight

---

## Why These Files?

**calculateDiscount.ts:**
- ✅ Realistic business logic (e-commerce discounts)
- ✅ Clear function boundaries (easy to highlight)
- ✅ Obvious edge cases (great for natural questions)
- ✅ ~50 lines (fills screen, not overwhelming)

**ShoppingCart.tsx:**
- ✅ Related to first file (natural context)
- ✅ Calls the discount function (cross-file reference)
- ✅ Provides reason to navigate back
- ✅ React component (familiar to many devs)

**The Prompt:**
- ✅ Natural three-part structure
- ✅ Realistic code review question
- ✅ Shows RangeLink as part of conversation
- ✅ Demonstrates edge case thinking
