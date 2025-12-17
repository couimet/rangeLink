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

### 1. Record Visual

**Recommended tools (macOS):**

| Tool | Cost | Notes |
|------|------|-------|
| **Kap** | Free | [getkap.co](https://getkap.co), open source, exports GIF/MP4 |
| **OBS Studio** | Free | Professional, open source |
| **Built-in** | Free | `Cmd+Shift+5` → Record Selection |
| **CleanShot X** | Paid | Professional features |

**Settings:**

- Light theme for readability
- Font size 16-18px
- Hide dock and notifications
- Export as MP4 (1080p) for editing

### 2. Add AI Voiceover (Optional)

For YouTube/video content, add AI-generated voiceover after recording.

**Recommended: Edge TTS** (free, unlimited, Microsoft neural voices)

```bash
# Install
pip install edge-tts

# Generate voiceover with pauses (SSML)
edge-tts --text "RangeLink captures the exact location. <break time='2s'/> Click any link to jump back." \
  --voice en-US-GuyNeural \
  --write-media voiceover.mp3

# List available voices
edge-tts --list-voices
```

**Alternative voice tools:**

| Tool | Free Tier | Notes |
|------|-----------|-------|
| **Edge TTS** | Unlimited | Best free option, SSML pause support |
| **ElevenLabs** | 10k chars/month | Highest quality |
| **OpenAI TTS API** | Pay-per-use | ~$0.01 for 60s script |

### 3. Add Background Music (Optional)

**Royalty-free sources:**

| Source | Cost | Notes |
|--------|------|-------|
| **YouTube Audio Library** | Free | No attribution for most tracks |
| **Pixabay Music** | Free | Attribution sometimes required |
| **Free Music Archive** | Free | Various licenses |
| **Incompetech** | Free | Attribution required |

### 4. Combine in Video Editor

For videos with voiceover/music, use a video editor to combine tracks.

**Recommended: DaVinci Resolve** (free, professional grade)

| Tool | Cost | Notes |
|------|------|-------|
| **DaVinci Resolve** | Free | Professional, best for audio sync |
| **CapCut** | Free | Easy timeline, basic AI voice built-in |
| **iMovie** | Free | macOS only, simple |
| **Kdenlive** | Free | Open source, all platforms |

**Workflow:**
1. Import video recording (MP4)
2. Import voiceover (MP3)
3. Import background music
4. Align voiceover to video timeline
5. Export final MP4

### 5. Optimize for Platforms

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

### 6. Upload to GitHub Release

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

### 7. Reference in README

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
