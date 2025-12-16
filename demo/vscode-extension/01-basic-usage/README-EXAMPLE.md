# Example: How to Add Demo to README

This file shows exactly where to place your demo GIF in the README.

## Visual Placement Example

```markdown
# RangeLink - Share Code Across Editors & Tools

<div align="center">
  <img src="https://raw.githubusercontent.com/couimet/rangelink/main/assets/icon.png" alt="RangeLink Logo" width="128" />
</div>

[![Version](https://img.shields.io/visual-studio-marketplace/v/couimet.rangelink-vscode-extension)](...)
[![License](https://img.shields.io/badge/license-MIT-green)](...)

> **"Hey, check out lines 42 to 58... or was it 48 to 62?"** 🤔
> **Never again.** RangeLink gives you `src/auth.ts#L42C10-L58C25` — precise, portable, and **just works**.

<!-- ⭐ ADD YOUR DEMO GIF HERE ⭐ -->
<div align="center">
  <img src="https://raw.githubusercontent.com/couimet/rangelink/main/assets/demo.gif"
       alt="RangeLink Demo - Generate precise code links and navigate back with a click"
       width="800" />
  <br/>
  <em>Set context → Generate link → Complete question → Navigate back</em>
</div>

---

## Why RangeLink?

### For AI-Assisted Development
...
```

---

## Exact Git Commands

### 1. After recording and converting to GIF:

```bash
# Create assets directory if it doesn't exist
mkdir -p assets

# Move your optimized GIF to assets
mv ~/Desktop/demo.gif assets/

# Add to git
git add assets/demo.gif

# Commit
git commit -m "docs(vscode-ext): add demo GIF showcasing core workflow

Shows three-part prompt structure and navigation features:
- Setting context before RangeLink
- Generating and pasting link to terminal
- Completing question with link visible
- Hover tooltip and click navigation

Recorded in light mode for maximum readability."

# Push
git push origin main
```

### 2. Update the README:

```bash
# Open the README
code packages/rangelink-vscode-extension/README.md

# Add the demo section after the quote, before "## Why RangeLink?"
# Use the template above

# Commit the README update
git add packages/rangelink-vscode-extension/README.md
git commit -m "docs(vscode-ext): add demo GIF to README above the fold"
git push origin main
```

---

## Alternative: Use GitHub Releases for Assets

If you want to keep the repo lean:

```bash
# 1. Create a new release on GitHub
# Go to: https://github.com/couimet/rangelink/releases/new

# 2. Tag: v0.2.2 (or whatever your next version is)

# 3. Upload demo.gif as a release asset

# 4. Get the download URL (right-click the asset, copy link)

# 5. Use that URL in README:
```

```markdown
<div align="center">
  <img src="https://github.com/couimet/rangelink/releases/download/v0.2.2/demo.gif"
       alt="RangeLink Demo"
       width="800" />
</div>
```

**Pros:**
- ✅ Doesn't bloat the repo
- ✅ Assets are versioned with releases
- ✅ Easy to update (upload new asset to new release)

**Cons:**
- ❌ Requires a GitHub release
- ❌ URL is longer
- ❌ Less discoverable in repo browse

---

## File Size Optimization

If your GIF is too large (>5MB):

### Option 1: Reduce FPS
```bash
gifski -o demo.gif --fps 12 --quality 90 --width 800 recording.mp4
# (was 15 fps, now 12)
```

### Option 2: Reduce Quality
```bash
gifski -o demo.gif --fps 15 --quality 80 --width 800 recording.mp4
# (was 90 quality, now 80)
```

### Option 3: Reduce Width
```bash
gifski -o demo.gif --fps 15 --quality 90 --width 700 recording.mp4
# (was 800px, now 700px)
```

### Option 4: Trim Duration
- Cut 5 seconds from the demo
- Remove the "closing" fade (end on navigation)
- 35 seconds instead of 40-45

**Target:** Under 5MB for GitHub embedding

---

## Testing the Demo URL

Before committing, test that the raw GitHub URL works:

```bash
# After pushing to GitHub, construct the raw URL:
https://raw.githubusercontent.com/couimet/rangelink/main/assets/demo.gif

# Open in incognito browser to test:
open "https://raw.githubusercontent.com/couimet/rangelink/main/assets/demo.gif"

# If it loads, you're good to add to README!
```

---

## Caption Variations

Choose a caption that matches your demo's narrative:

### Option 1: Process-focused
```markdown
<em>Set context → Generate link → Complete question → Navigate back</em>
```

### Option 2: Benefit-focused
```markdown
<em>Precise code references, effortless navigation</em>
```

### Option 3: Use case-focused
```markdown
<em>Works seamlessly with claude-code and other AI assistants</em>
```

### Option 4: Feature-focused
```markdown
<em>Three-part prompts with hover tooltips and click navigation</em>
```

**Recommended:** Use Option 1 (process-focused) since your demo shows the workflow

---

## Multi-GIF Strategy (Advanced)

If you want multiple demos in the README:

```markdown
## Why RangeLink?

### For AI-Assisted Development

<img src="assets/demo-ai-workflow.gif" alt="AI Workflow" width="700" align="right" />

**Using claude-code or ChatGPT?** RangeLink eliminates context-sharing friction...

### For Code Reviews

<img src="assets/demo-code-review.gif" alt="Code Review" width="700" align="right" />

Share precise references that teammates can click to navigate...

### For Team Collaboration

<img src="assets/demo-collaboration.gif" alt="Collaboration" width="700" align="right" />

Universal format that works across editors and tools...
```

**Requires:** Creating multiple focused demos (10-15s each)

---

## Analytics (Optional)

Track demo impact with UTM parameters:

```markdown
<div align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=couimet.rangelink-vscode-extension&utm_source=github&utm_medium=demo&utm_campaign=readme">
    <img src="https://raw.githubusercontent.com/couimet/rangelink/main/assets/demo.gif"
         alt="RangeLink Demo"
         width="800" />
  </a>
  <br/>
  <em>Click to install from VS Code Marketplace</em>
</div>
```

Makes the GIF clickable and tracks conversions!

---

## Quick Reference

**TL;DR:**

1. Record in **light mode** (`Cmd+K Cmd+T` → "Light+ (default light)")
2. Export with Gifski: `gifski -o assets/demo.gif --fps 15 --quality 90 --width 800 recording.mp4`
3. Add to repo: `git add assets/demo.gif && git commit && git push`
4. Update README: Add the `<div>` block **after the quote, before "Why RangeLink?"**
5. Test: Open raw URL in incognito browser
6. Done! 🎉
