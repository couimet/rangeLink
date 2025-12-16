# Demo: Basic RangeLink Usage

**Goal:** Show how RangeLink integrates naturally into conversation, plus demonstrate hover and navigation features.

**Duration:** 40-45 seconds (includes navigation demo)

**Key Message:** "Precise code context, effortless navigation."

---

## 📋 Quick Start

**For rapid setup, use the [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) cheat sheet.**

For detailed instructions and alternatives, continue reading below.

---

## 🎯 Demo Scenario

This demo shows a **realistic three-part prompt** structure:

1. **Context** - Set up your question
2. **RangeLink** - Reference specific code with the extension
3. **Question** - Complete your prompt

Then demonstrate **navigation**: hover over the link and click to jump back to the code.

### Demo Files

- **calculateDiscount.ts** - Discount logic (highlight lines 20-42)
- **ShoppingCart.tsx** - Component using the discount function
- **DEMO-PROMPT.md** - Complete prompt structure and alternatives

---

## 🎬 Setup Instructions

### 1. Window Layout

Open VSCode with a **split terminal layout**:

```bash
# Terminal 1: Set up the demo
cd demo/vscode-extension/01-basic-usage
code calculateDiscount.ts ShoppingCart.tsx

# Terminal 2 (in VSCode integrated terminal): Start Claude Code
claude-code
```

Configure your VSCode window:

```
┌──────────────────────────────────────┐
│ user-validator.ts (EDITOR)           │  ← Top 60% of window
│                                      │
│ [Code visible, line numbers shown]   │
│                                      │
├──────────────────────────────────────┤
│ TERMINAL (Claude Code running)       │  ← Bottom 40%
│ › [cursor blinking]                  │
└──────────────────────────────────────┘
```

**Hotkey:** `Cmd+J` (macOS) or `Ctrl+J` (Windows/Linux) to toggle terminal

### 2. Display Settings

For maximum readability in recordings:

1. **Theme:** Use a light theme (e.g., "Light+ (default light)")
   - `Cmd+K Cmd+T` → Select light theme

2. **Font Size:** Increase to 16-18px
   - `Cmd+,` → Search "font size" → Set to `16`

3. **Hide Distractions:**
   - Close minimap: `Cmd+,` → Search "minimap" → Uncheck "Editor > Minimap: Enabled"
   - Hide activity bar: `Cmd+B` (if needed)
   - Close all other tabs

4. **Ensure Line Numbers Visible:**
   - `Cmd+,` → Search "line numbers" → Set to "on"

### 3. Recording Tool Setup

**Kap Settings:**

- Format: GIF or MP4 (GIF for Twitter/GitHub, MP4 for YouTube)
- FPS: 15 (sufficient for this demo)
- Size: Record full VSCode window
- Show clicks: Optional (helps viewers follow actions)

**Alternative: Built-in macOS Screen Recording**

```
Cmd+Shift+5 → Select area → Options → Show Mouse Clicks → Record
```

### 4. Pre-Recording Checklist

Before hitting record:

- [ ] `calculateDiscount.ts` is open and visible (scrolled to show lines 20-42)
- [ ] `ShoppingCart.tsx` is open in another tab
- [ ] Claude Code is running in terminal below
- [ ] Font size is readable (16-18px)
- [ ] Line numbers are visible
- [ ] No notifications/popups will interrupt
- [ ] Dock is hidden (optional: `Cmd+Option+D`)
- [ ] Menu bar is clean (close Slack, etc.)

---

## 🎯 Recording Steps

Follow these steps exactly. See [DEMO-PROMPT.md](./DEMO-PROMPT.md) for full details and [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) for a cheat sheet.

### Part 1: Set Context (5 seconds)

- **Action:** Click into terminal at Claude Code prompt
- **Type/Paste:**
  ```
  I'm reviewing the discount logic in the shopping cart.
  ```
- **Press:** Enter to move to next line
- **Tip:** Type slowly so viewers can read

### Part 2: Generate RangeLink (8 seconds)

- **Action:** Click into editor (`calculateDiscount.ts`)
- **Highlight:** Lines 20-42 (the entire `calculateDiscount` function)
- **Hotkey:** `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
- **Type:** "RangeLink"
- **Select:** "RangeLink: Copy RangeLink to Clipboard"
- **Action:** Click into terminal
- **Paste:** `Cmd+V` - the RangeLink appears
- **Pause:** 2 seconds (let viewers see the link format)

### Part 3: Complete Question (7 seconds)

- **Press:** Enter to move to next line
- **Type:**
  ```
  How does this handle edge cases when the cart subtotal is exactly at the minPurchase threshold?
  ```
- **Pause:** 2 seconds (viewers read the complete prompt)

### Part 4: Submit (5 seconds)

- **Press:** Enter
- **Result:** Claude Code starts processing
- **Optional:** Capture first 2-3 seconds of response

### Part 5: Navigation Demo (10 seconds)

**Show hover tooltip:**

- **Action:** Press `Cmd+W` to close `calculateDiscount.ts`
- **Result:** Now `ShoppingCart.tsx` is visible (or blank editor)
- **Action:** Hover cursor over the RangeLink in terminal
- **Result:** Tooltip appears showing file path and code preview
- **Pause:** 2 seconds (let viewers see tooltip)

**Show navigation:**

- **Action:** Click the RangeLink (or `Cmd+Click`)
- **Result:** `calculateDiscount.ts` opens with lines 20-42 highlighted
- **Pause:** 2 seconds (emphasize the navigation)

### Step 8: End Screen (3 seconds)

- **Optional:** Fade to black with text overlay:
  ```
  RangeLink for VSCode
  github.com/Shopify/rangeLink
  ```

---

## 📝 The Prompt

**Primary Prompt (use this one):**

```
This email validation looks fragile. How can I make it more robust?
```

**Why this prompt works:**

- ✅ Natural use case (code review)
- ✅ RangeLink provides exact context (lines 13-28)
- ✅ Shows value: Claude immediately knows which code to analyze

**Alternative Prompts:**

If you want to highlight different sections:

1. **Lines 31-39 (batch validation):**

   ```
   Why is this batch validation slow? Can we optimize it?
   ```

2. **Lines 11-34 (entire validateUser function):**

   ```
   What security issues exist in this validation?
   ```

3. **Lines 13-18 (just email check):**
   ```
   Refactor this email validation to be more comprehensive
   ```

---

## 🎨 Post-Production

### Adding Text Overlays (Optional)

Use these overlay texts sparingly:

1. **Opening (0:00-0:03):** "Need to ask about specific code?"
2. **After highlight (0:08-0:10):** "✨ Just highlight and copy"
3. **After paste (0:15-0:17):** "🎯 Precise context, instant communication"
4. **Closing (0:40-0:45):** "RangeLink for VSCode"

**Tools for overlays:**

- **Kapwing** (web-based, free tier)
- **iMovie** (macOS, free)
- **DaVinci Resolve** (cross-platform, free)

### GIF Optimization

If exporting as GIF:

```bash
# Use Gifski for high-quality compression (macOS)
brew install gifski

# Convert video to optimized GIF
gifski -o demo.gif --fps 15 --quality 90 recording.mp4
```

Target: **Under 5MB** for easy sharing on GitHub/Twitter

### Video Export

If using MP4:

- **Resolution:** 1080p (1920x1080) or 720p (1280x720)
- **Codec:** H.264 (universal compatibility)
- **Bitrate:** 5-10 Mbps (high quality, reasonable file size)

---

## 🐛 Troubleshooting

### RangeLink Command Not Found

- Ensure extension is installed: `code --list-extensions | grep rangelink`
- Reload VSCode: `Cmd+Shift+P` → "Developer: Reload Window"

### Claude Code Not Responding

- Check that you're in the correct terminal
- Ensure Claude Code is actually running (you should see the prompt `›`)

### Video Quality Issues

- Increase recording resolution in Kap settings
- Use MP4 instead of GIF for higher quality
- Ensure VSCode font size is 16px minimum

### Timing Feels Rushed

- Add 1-2 second pauses after each action
- Viewers need time to read text and understand what's happening
- Better to be too slow than too fast

---

## 📤 Where to Share

Once recorded:

1. **GitHub README** - Embed at the top of the main README
2. **Twitter/X** - With hashtags: `#VSCode #Developer #Productivity`
3. **Reddit** - r/vscode, r/coding (check subreddit rules)
4. **DEV.to / Hashnode** - Write a short article with the demo
5. **Internal Shopify Channels** - Share in relevant Slack channels

---

## 🔄 Variations

Once you've mastered the basic demo, try these variations:

### Variation A: Show "Before and After"

1. First show manually copying filename + line numbers (painful)
2. Then show RangeLink (effortless)

### Variation B: Multiple Selections

1. Highlight one section, copy link
2. Highlight another section, copy another link
3. Paste both into Claude Code with a comparison question

### Variation C: Rectangular Selection (Advanced)

- Use `Option+Shift+Drag` (macOS) to select columns
- Show RangeLink handling rectangular selections

---

## 📋 Quick Reference

**Essential Hotkeys:**

- Command Palette: `Cmd+Shift+P` (macOS) / `Ctrl+Shift+P` (Win/Linux)
- Toggle Terminal: `Cmd+J` (macOS) / `Ctrl+J` (Win/Linux)
- Paste: `Cmd+V` (macOS) / `Ctrl+V` (Win/Linux)

**Recording Checklist:**

- ✅ Font size 16-18px
- ✅ Light theme enabled
- ✅ Line numbers visible
- ✅ Notifications disabled
- ✅ Clean workspace (no extra tabs)
- ✅ Terminal in split view below
- ✅ Claude Code running and ready

**Target Specs:**

- Duration: 30-45 seconds
- File size: <5MB (GIF) or <20MB (MP4)
- Resolution: 720p minimum
