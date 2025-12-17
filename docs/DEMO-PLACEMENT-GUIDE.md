# Demo Placement Guide

How to add demo GIFs to the RangeLink README.

---

## Recommended Placement

**Place immediately after badges, before "Why RangeLink?"** — prime real estate, visible without scrolling.

```markdown
# RangeLink - Share Code Across Editors & Tools

<div align="center">
  <img src="..." alt="RangeLink Logo" width="128" />
</div>

[![Version](...)][...]
[![License](...)][...]

> **"Hey, check out lines 42 to 58..."** ...

<!-- DEMO GOES HERE -->
<div align="center">
  <img src="https://github.com/couimet/rangeLink/releases/download/demo-assets-v1/basic-usage.gif"
       alt="RangeLink Demo - Generate and navigate code links"
       width="800" />
  <br/>
  <em>Set context → Generate link → Complete question → Navigate back</em>
</div>

---

## Why RangeLink?

...
```

---

## Theme: Light Mode

**Use light mode for demos.** It provides:

- Better contrast in compressed GIFs
- Readability at small sizes (mobile, Twitter)
- Stands out against GitHub's dark mode option

Most successful extensions (Prettier, ESLint, GitLens) use light mode demos.

---

## Adding the Demo

### 1. Record and optimize

See `demo/ASSET-STORAGE.md` for recording workflow.

### 2. Upload to GitHub Release

```bash
gh release upload demo-assets-v1 basic-usage.gif
```

### 3. Update README

Add this block after the tagline quote:

```markdown
<div align="center">
  <img src="https://github.com/couimet/rangeLink/releases/download/demo-assets-v1/basic-usage.gif"
       alt="RangeLink Demo - Generate and navigate code links"
       width="800" />
  <br/>
  <em>Set context → Generate link → Complete question → Navigate back</em>
</div>
```

### 4. Verify

Test the raw URL in incognito browser before committing.

---

## Caption Options

Choose based on demo content:

| Style    | Caption                                                           |
| -------- | ----------------------------------------------------------------- |
| Process  | `Set context → Generate link → Complete question → Navigate back` |
| Benefit  | `Precise code references, effortless navigation`                  |
| Use case | `Works seamlessly with Claude Code and other AI assistants`       |

---

## File Size Targets

| Format | Target | Use case               |
| ------ | ------ | ---------------------- |
| GIF    | <5MB   | GitHub README, Twitter |
| MP4    | <20MB  | YouTube, longer demos  |

**If too large:**

```bash
# Reduce FPS
gifski -o demo.gif --fps 12 --quality 90 --width 800 recording.mp4

# Or reduce quality
gifski -o demo.gif --fps 15 --quality 80 --width 800 recording.mp4

# Or reduce width
gifski -o demo.gif --fps 15 --quality 90 --width 700 recording.mp4
```

---

## Clickable Demo (Optional)

Make the GIF link to the marketplace:

```markdown
<div align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=couimet.rangelink-vscode-extension">
    <img src="https://github.com/couimet/rangeLink/releases/download/demo-assets-v1/basic-usage.gif"
         alt="RangeLink Demo"
         width="800" />
  </a>
  <br/>
  <em>Click to install from VS Code Marketplace</em>
</div>
```
