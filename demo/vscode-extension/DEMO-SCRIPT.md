# VSCode Extension Demo Index

This directory contains multiple demo scenarios for the RangeLink VSCode extension. Each demo is self-contained with its own materials, instructions, and narrative.

## 🎯 Core Message

**"Stop copying line numbers. Start sharing precise code context."**

---

## 📁 Available Demos

### [01-basic-usage](./01-basic-usage/) ⭐

**The Essential Demo**

**Focus:** Core RangeLink workflow (highlight → generate link → automatic paste)<br />
**Duration:** 30-45 seconds<br />
**Audience:** Developers new to RangeLink<br />
**Key Message:** Eliminate tedious line number copying

**What's Included:**

- ✅ Step-by-step recording instructions
- ✅ Sample TypeScript file (`user-validator.ts`)
- ✅ Complete narrative with timing
- ✅ Suggested prompts and variations

[→ View Instructions](./01-basic-usage/README.md)

---

## 🎬 Future Demo Ideas

### 02-rectangular-selection

**Advanced Feature Demo**

Show RangeLink's support for column/rectangular selections:

- Use `Option+Shift+Drag` (macOS) to select columns
- Demonstrate how RangeLink captures rectangular ranges
- Highlight use case: comparing similar code structures

---

## 📝 General Recording Tips

### Display Settings

- **Theme:** Light themes work best for visibility
- **Font Size:** 16-18px minimum (readable when scaled down)
- **Hide Distractions:** Close notifications, dock, unrelated apps

### Pacing

- **Slow down!** Actions that feel slow to you are perfect for viewers
- **Pause 1-2 seconds** after each key action
- **Show text clearly** especially command palette entries

### Polish

- **Practice first** - do 2-3 dry runs before recording
- **Clean workspace** - close extra tabs/files
- **Smooth movements** - deliberate, not jittery
- **Visible cursor** - ensure it doesn't disappear off-screen

### File Selection

Demo files should be:

- ✅ Realistic (not "hello world")
- ✅ ~40 lines max (scannable)
- ✅ Clear improvement opportunity (for prompts)

---

## 🚀 Post-Production Guide

### GIF Export

**Target:** <5MB for easy GitHub/Twitter sharing

```bash
# Use Gifski for high-quality compression (macOS)
brew install gifski
gifski -o demo.gif --fps 15 --quality 90 recording.mp4
```

**Settings:**

- FPS: 10-15 (sufficient for UI demos)
- Quality: 80-90 (balance size vs clarity)

### MP4 Export

**Target:** <20MB, high quality

**Settings:**

- Resolution: 1080p (1920x1080) or 720p (1280x720)
- Codec: H.264 (universal compatibility)
- Bitrate: 5-10 Mbps

### Adding Text Overlays

**Tools:**

- **Kapwing** - Web-based, free tier available
- **iMovie** - macOS, free with system
- **DaVinci Resolve** - Cross-platform, free version is powerful

**Guidelines:**

- Use text sparingly (let actions speak)
- Large, bold fonts (readable at small sizes)
- High contrast (white text with dark shadow, or vice versa)
- Brief duration (2-3 seconds max per overlay)

---

## 📤 Distribution Checklist

### Before Sharing

- [ ] Video is under target file size (<5MB GIF or <20MB MP4)
- [ ] Text overlays are readable at small sizes
- [ ] All actions are clearly visible
- [ ] No typos or errors in prompts
- [ ] Ending includes GitHub URL (for 3-5 seconds)

### Where to Share

1. **GitHub README** - Embed at top of main README (primary location)
2. **Twitter/X** - Hashtags: `#VSCode #ClaudeCode #Developer #Productivity`
3. **Reddit** - r/vscode, r/programming (check subreddit rules first)
4. **DEV.to / Hashnode** - Write accompanying article
5. **Shopify Internal** - Share in relevant Slack channels
6. **YouTube** - For longer-form demos (60+ seconds)

---

## 🆕 Adding New Demos

Want to create a new demo scenario? Here's the structure:

```
vscode-extension/
└── XX-demo-name/
    ├── README.md           # Step-by-step recording instructions
    ├── narrative.md        # Script with timing and voiceover
    ├── sample-file.ts      # Demo code file(s)
    └── [optional-assets]/  # Screenshots, reference images, etc.
```

**Naming Convention:** Use numeric prefixes for ordering: `01-`, `02-`, etc.

**README.md should include:**

- Setup instructions (window layout, display settings)
- Pre-recording checklist
- Step-by-step recording guide
- Troubleshooting section

**narrative.md should include:**

- Timing breakdown (scene-by-scene)
- Voiceover script (optional)
- Text overlay suggestions
- Alternative narrative variations

---

## 💡 Demo Best Practices

### Do's ✅

- Show realistic code (relatable to viewers)
- Use natural prompts (actual questions you'd ask)
- Demonstrate clear value (before/after, time saved)
- Include call-to-action (GitHub URL visible)
- Test at small sizes (Twitter timeline, mobile)

### Don'ts ❌

- Rush through actions (viewers need time to understand)
- Use tiny fonts (unreadable when scaled down)
- Include unnecessary features (focus on one thing)
- Forget pauses (let key moments sink in)
- Skip the ending (CTA is crucial)

---

## 📊 Success Metrics

Track these after publishing:

**Engagement:**

- Likes, shares, retweets
- Comments (especially "This is useful!" type)
- Saves/bookmarks

**Traffic:**

- GitHub link clicks (use UTM parameters)
- Extension page views
- Download/install metrics

**Feedback:**

- Feature requests inspired by demo
- Questions about usage
- Requests for more demos

---

## 🔗 Quick Links

- [Main RangeLink README](../../README.md)
- [VSCode Extension README](../../packages/rangelink-vscode-extension/README.md)
- [Contributing Guide](../../CONTRIBUTING.md)
- [Roadmap](../../docs/ROADMAP.md)
