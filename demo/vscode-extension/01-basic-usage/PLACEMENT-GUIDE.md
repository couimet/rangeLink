# Demo Video Placement Guide

This guide explains where and how to add your demo video/GIF to maximize impact.

## 🎯 Recommended Placement

### Option 1: "Above the Fold" (RECOMMENDED)

**Place immediately after badges, before "Why RangeLink?"**

This is the prime real estate — visitors see it without scrolling.

```markdown
# RangeLink - Share Code Across Editors & Tools

<div align="center">
  <img src="https://raw.githubusercontent.com/couimet/rangelink/main/assets/icon.png" alt="RangeLink Logo" width="128" />
</div>

[![Version](https://img.shields.io/visual-studio-marketplace/v/couimet.rangelink-vscode-extension)]...
[![License](https://img.shields.io/badge/license-MIT-green)]...

> **"Hey, check out lines 42 to 58... or was it 48 to 62?"** 🤔
> **Never again.** RangeLink gives you `src/auth.ts#L42C10-L58C25` — precise, portable, and **just works**.

<!-- ADD DEMO HERE -->
<div align="center">
  <img src="https://raw.githubusercontent.com/couimet/rangelink/main/assets/demo.gif" alt="RangeLink Demo" width="800" />
  <p><em>Generate precise code links and navigate back with a click</em></p>
</div>

## Why RangeLink?
...
```

**Why this works:**
- ✅ Immediate visual impact
- ✅ "Show, don't tell" before any explanation
- ✅ Hooks attention in the first 3 seconds
- ✅ Standard placement for popular extensions (Prettier, ESLint, GitLens)

---

### Option 2: In "Quick Start" Section

**Place right after the command table to show what it looks like in action:**

```markdown
## Quick Start

### Basic Usage

1. **Select text** in the editor (non-empty selection required)
2. **Press `Cmd+R Cmd+L`** (Mac) or `Ctrl+R Ctrl+L` (Windows/Linux)
3. Link copied to clipboard!

**Example output:**
```
src/utils/parser.ts#L42C10-L58C25
```

<!-- ADD DEMO HERE -->
<div align="center">
  <img src="https://raw.githubusercontent.com/couimet/rangelink/main/assets/demo-basic.gif" alt="Basic Usage Demo" width="700" />
</div>
```

**Why this works:**
- ✅ Shows exactly what the instructions describe
- ✅ Helps visual learners understand the workflow
- ✅ Complements the text instructions

---

### Option 3: Both Locations (BEST)

**Use two different GIFs:**

1. **Above the fold:** 20-30 second "wow" demo showing full workflow (context → link → navigation)
2. **Quick Start:** 10-15 second focused demo showing just the basic copy command

**Benefits:**
- ✅ Hook visitors immediately with full demo
- ✅ Provide focused instruction with basic demo
- ✅ Cater to different learning styles

---

## 🎨 Theme Choice: Light vs Dark

### TL;DR: **Use Light Mode for Maximum Readability**

Here's why, with data:

### Light Mode ✅ (RECOMMENDED)

**Pros:**
- ✅ **Better contrast** in compressed GIFs (text remains sharp)
- ✅ **More readable at small sizes** (Twitter, mobile GitHub)
- ✅ **Universal accessibility** (works for all viewers, including visually impaired)
- ✅ **Stands out** in dark-themed GitHub README (provides contrast)
- ✅ **Professional appearance** (clean, polished)

**Cons:**
- ❌ Less "cool factor" among developers
- ❌ May look unusual to developers who use dark themes

**Examples of successful light-mode demos:**
- GitHub Copilot (official docs)
- Prettier extension
- ESLint extension

### Dark Mode

**Pros:**
- ✅ **Developer preference** (most devs use dark themes)
- ✅ **"Cool factor"** (looks sleek and modern)
- ✅ **Authentic** (matches real usage for many users)

**Cons:**
- ❌ **Reduced contrast** in compressed GIFs (colors blend)
- ❌ **Harder to read** at small sizes or on mobile
- ❌ **Less accessible** (lower contrast for some viewers)
- ❌ **Blends into GitHub** (dark on dark-ish background)

**Examples:**
- Many indie extensions use dark mode
- Works well for video (MP4) but struggles in GIF compression

---

## 📊 Data-Driven Recommendation

### Comparison Table

| Aspect | Light Mode | Dark Mode | Winner |
|--------|-----------|-----------|--------|
| GIF compression quality | Excellent | Good | Light |
| Readability (small sizes) | Excellent | Fair | Light |
| Readability (mobile) | Excellent | Good | Light |
| Contrast against GitHub | Excellent | Fair | Light |
| Developer appeal | Good | Excellent | Dark |
| Accessibility | Excellent | Good | Light |
| Professional polish | Excellent | Good | Light |

**Score: Light Mode wins 6/7 categories**

---

## 🎯 Final Recommendation

### For This Demo: **Light Mode**

**Reasoning:**
1. Your demo is **40-45 seconds** with detailed UI interactions
2. Terminal text and links must be **clearly readable**
3. GIF compression will be necessary to stay under **5MB**
4. Target audience includes **non-technical stakeholders** (for internal Shopify sharing)
5. Placement "above the fold" means it's the **first impression**

**Exception:** If you create a separate **MP4 video for YouTube**, use dark mode for that version.

---

## 🎬 Multi-Format Strategy

Consider creating **multiple versions** for different contexts:

### 1. GitHub README (Light Mode GIF)
```
demo-light-40s.gif (4.5MB)
```
- 40 seconds, full workflow
- Light theme for readability
- Place above the fold

### 2. Twitter/Social (Light Mode GIF)
```
demo-light-15s.gif (2MB)
```
- 15 seconds, speed run
- Light theme for mobile readability
- Optimized for social sharing

### 3. YouTube/Loom (Dark Mode MP4)
```
demo-dark-60s.mp4 (15MB)
```
- 60 seconds, includes voiceover
- Dark theme for developer appeal
- Link from README: "Watch full tutorial →"

### 4. Documentation (Light Mode GIF)
```
demo-feature-X.gif (1-2MB each)
```
- Separate GIFs for each feature
- Light theme for consistency
- Use in feature documentation

---

## 📦 Implementation Steps

### Step 1: Record in Light Mode
```
VSCode Settings:
- Theme: "Light+ (default light)"
- Font size: 16-18px
- High contrast: Yes
```

### Step 2: Create Asset Directory
```bash
mkdir -p assets
```

### Step 3: Export Optimized GIF
```bash
# Using Gifski (highest quality)
gifski -o assets/demo.gif --fps 15 --quality 90 --width 800 recording.mp4

# Target: 4-5MB for full demo, under 2MB for short clips
```

### Step 4: Upload to GitHub
```bash
git add assets/demo.gif
git commit -m "docs: add demo GIF to showcase core workflow"
git push
```

### Step 5: Update README
```markdown
<div align="center">
  <img src="https://raw.githubusercontent.com/couimet/rangelink/main/assets/demo.gif"
       alt="RangeLink Demo - Generate and navigate code links"
       width="800" />
  <p><em>Set context → Generate link → Ask question → Navigate back</em></p>
</div>
```

---

## 🎨 Visual Guidelines

### Composition
- **Keep VSCode centered** (don't show desktop edges)
- **Terminal visible** (split view, 40% of screen)
- **No distractions** (close dock, menu bar clutter, notifications)

### Size & Format
- **Width:** 800-1200px (readable but not huge)
- **Format:** GIF for GitHub, MP4 for video platforms
- **File size:** <5MB for GIF, <20MB for MP4

### Annotations
- **Minimal text overlays** (let actions speak)
- **High contrast** (white text with shadow, or vice versa)
- **Brief duration** (2-3 seconds max per overlay)

### Pacing
- **Slow down!** What feels slow to you is perfect for viewers
- **Pause after key actions** (1-2 seconds)
- **Loop seamlessly** (GIF should feel continuous)

---

## ✅ Pre-Publishing Checklist

Before adding to README:

- [ ] Recorded in **light mode** with high contrast
- [ ] Font size **16-18px** (readable at 800px width)
- [ ] **Terminal text is sharp** and clearly readable
- [ ] File size **under 5MB** for GIF
- [ ] Tested at **multiple sizes** (looks good at 600px, 800px, 1000px)
- [ ] **Alt text** is descriptive for accessibility
- [ ] GIF **loops smoothly** (or fades to end card)
- [ ] Uploaded to `assets/` directory in repo
- [ ] Raw link URL works (test in incognito browser)

---

## 🚀 Bonus: A/B Testing

If you want to be data-driven:

1. **Ship with light mode demo** (recommended start)
2. **Track metrics:**
   - Extension installs (before/after demo added)
   - GitHub README views (GitHub Insights)
   - Social engagement (if sharing on Twitter)
3. **Consider dark mode variant** after 2-4 weeks
4. **Compare performance** (installs, engagement)

Most likely, light mode will perform better due to readability, but you'll have data!

---

## 📚 Examples to Study

**Extensions with great demos (mostly light mode):**

1. **Prettier** - Light mode, simple, 10 seconds
   - https://github.com/prettier/prettier-vscode

2. **GitLens** - Light mode, feature-focused
   - https://github.com/gitkraken/vscode-gitlens

3. **ESLint** - Light mode, problem/solution
   - https://github.com/microsoft/vscode-eslint

**Note:** Most successful extensions use light mode for demos!

---

## 🎯 Summary

**Placement:** Above the fold (after badges, before "Why RangeLink?")

**Theme:** Light mode for maximum readability and GIF compression quality

**Format:** GIF for GitHub (5MB max), MP4 for YouTube/Loom

**Size:** 800px width for main demo

**Message:** Show the three-part prompt + navigation workflow

You've got this! 🚀
