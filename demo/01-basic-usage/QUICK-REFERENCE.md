# Quick Reference Card

Use this as a cheat sheet while recording.

## Files

- 📄 `calculateDiscount.ts` - Start here, highlight lines 21-44
- 📄 `ShoppingCart.tsx` - Switch to this to demo navigation

## The Three-Part Prompt

### Part 1: Context (Type first)

```
I'm reviewing the discount logic in the shopping cart.
```

### Part 2: RangeLink (Generate with extension)

1. Highlight lines 21-44 in `calculateDiscount.ts`
2. `Cmd+Shift+P` → "RangeLink: Copy RangeLink"
3. Paste into terminal

### Part 3: Question (Type after link)

```
How does this handle edge cases when the cart subtotal is exactly at the minPurchase threshold?
```

## Navigation Demo Steps

1. Close `calculateDiscount.ts` (Cmd+W)
2. Hover over RangeLink in terminal → See tooltip
3. Click RangeLink → File opens with highlighting

## Timing Targets

- 0:00-0:05: Setup
- 0:05-0:10: Type context
- 0:10-0:18: Generate RangeLink
- 0:18-0:25: Complete prompt
- 0:25-0:30: Submit
- 0:30-0:40: Navigation demo
- 0:40-0:45: Closing

## Pre-flight Checklist

- [ ] Both files open in VSCode
- [ ] Claude Code running in terminal
- [ ] **Light theme enabled** ("Light+ (default light)" recommended)
- [ ] Font size 16-18px
- [ ] Line numbers visible
- [ ] `calculateDiscount.ts` scrolled to show lines 21-44
- [ ] Recording tool ready (Monosnap for Shopify employees, or Kap/built-in)
- [ ] Notifications disabled
- [ ] Dock hidden (optional)

## Key Hotkeys

- Command Palette: `Cmd+Shift+P`
- Paste: `Cmd+V`
- Close tab: `Cmd+W`
- Toggle terminal: `Cmd+J`
