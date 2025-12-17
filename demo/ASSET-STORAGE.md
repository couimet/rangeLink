# Demo Asset Storage Guide

This document describes how to store and reference demo videos/GIFs for RangeLink.

---

## Storage Strategy: GitHub Releases

Demo binaries (GIFs, MP4s) are stored as **GitHub Release assets**, not in the repository.

### Why GitHub Releases?

- **Free** within GitHub limits (2GB per file, 100MB recommended)
- **No repository bloat** — binaries don't inflate clone size
- **Versioned** — assets tied to release tags
- **Simple** — no external services to manage

### URL Format

```
https://github.com/couimet/rangeLink/releases/download/{tag}/{filename}
```

**Example:**

```
https://github.com/couimet/rangeLink/releases/download/demo-assets-v1/basic-usage.gif
```

---

## Recording Workflow

### 1. Record

**Recommended tools (macOS):**

- **Kap** (free) — [getkap.co](https://getkap.co)
- **CleanShot X** (paid) — professional editing
- **Built-in** — `Cmd+Shift+5` → Record Selection

**Settings:**

- Light theme for readability
- Font size 16-18px
- Hide dock and notifications

### 2. Optimize

**GIF (for GitHub/Twitter):**

```bash
brew install gifski
gifski -o demo.gif --fps 15 --quality 90 --width 800 recording.mp4
```

**Target:** <5MB

**MP4 (for YouTube/longer content):**

- Resolution: 1080p or 720p
- Codec: H.264
- Bitrate: 5-10 Mbps
- Target: <20MB

### 3. Upload to GitHub Release

```bash
# Create release (first time)
gh release create demo-assets-v1 \
  --title "Demo Assets v1" \
  --notes "Demo videos and GIFs for documentation"

# Upload asset
gh release upload demo-assets-v1 demo.gif

# Or upload multiple assets
gh release upload demo-assets-v1 basic-usage.gif navigation-demo.gif
```

### 4. Reference in README

```markdown
<div align="center">
  <img src="https://github.com/couimet/rangeLink/releases/download/demo-assets-v1/basic-usage.gif"
       alt="RangeLink Demo"
       width="800" />
</div>
```

---

## Asset Naming Convention

```
{demo-name}-{variant}.{ext}
```

**Examples:**

- `basic-usage.gif` — primary demo
- `basic-usage-15s.gif` — short version for social
- `navigation-demo.gif` — feature-specific demo

---

## Updating Assets

**Option A: Replace in existing release**

```bash
# Delete old asset
gh release delete-asset demo-assets-v1 basic-usage.gif

# Upload new version
gh release upload demo-assets-v1 basic-usage.gif
```

**Option B: Create new release (recommended for major changes)**

```bash
gh release create demo-assets-v2 basic-usage.gif \
  --title "Demo Assets v2" \
  --notes "Updated demos with new navigation feature"
```

Then update README URLs to point to v2.

---

## Future Migration

If demo assets grow significantly (>10 videos, CDN needed), consider:

1. **Cloudflare R2** — S3-compatible, no egress fees, generous free tier
2. **Avoid S3** — egress costs add up for public assets

For now, GitHub Releases is sufficient and simplest.
