# RangeLink Demo Materials

This directory contains demo scripts, sample files, and recording instructions for creating promotional materials for RangeLink packages.

## 📁 Structure

```
demo/
├── README.md                    # This file - overview of demo organization
└── vscode-extension/            # VSCode/Cursor extension demos
    ├── DEMO-SCRIPT.md           # Index of all VSCode demos + general tips
    └── 01-basic-usage/          # Individual demo scenario
        ├── README.md            # Step-by-step recording instructions
        ├── narrative.md         # Script with timing and voiceover
        ├── DEMO-PROMPT.md       # Prompt structure and variations
        └── *.ts, *.tsx          # Sample code files for demo
```

### Future Package Demos

As RangeLink expands to other platforms, demos will be organized similarly:

```
demo/
├── vscode-extension/            # VSCode/Cursor demos (current)
├── neovim-plugin/               # Neovim demos (planned)
├── cli-tool/                    # CLI demos (planned)
└── [other-packages]/            # Future integrations
```

---

## 🎯 Demo Philosophy

Each demo is **self-contained** with:

1. **README.md** - Complete setup and recording instructions
   - Window layout requirements
   - Display settings (theme, font size)
   - Pre-recording checklist
   - Step-by-step actions
   - Troubleshooting guide

2. **narrative.md** - Storytelling and timing
   - Scene-by-scene breakdown with timestamps
   - Voiceover scripts (optional)
   - Text overlay suggestions
   - Alternative narrative approaches

3. **Sample files** - Realistic code examples
   - Relatable to target audience
   - Clear improvement opportunities (for prompts)
   - ~40 lines max (scannable in demos)

4. **Assets** (optional) - Supporting materials
   - Reference screenshots
   - Overlay templates
   - Export presets

---

## 🎬 Quick Start

### Recording Your First Demo

1. **Pick a demo scenario:**

   ```bash
   cd demo/vscode-extension/01-basic-usage
   ```

2. **Read the instructions:**
   - Open `README.md` for setup and recording steps
   - Review `narrative.md` for timing and script

3. **Set up your environment:**
   - Follow the "Setup Instructions" in README
   - Complete the pre-recording checklist
   - Do a practice run (no recording)

4. **Record:**
   - Start your screen capture tool (see recommendations below)
   - Follow the step-by-step recording guide
   - Don't rush - slower is better for viewers

5. **Post-process:**
   - Trim any dead time at start/end
   - Add text overlays (optional, but helpful)
   - Optimize file size (see export guidelines)

6. **Share:**
   - GitHub README (primary location)
   - Social media (Twitter, Reddit, DEV.to)

---

## 🛠 Recommended Tools

### Screen Capture (macOS)

**For quick demos:**

- **Kap** (Free) - [getkap.co](https://getkap.co)
  - Lightweight GIF/MP4 recorder
  - Open source, easy to use
  - Perfect for GitHub/Twitter

**For polished demos:**

- **CleanShot X** (Paid)
  - Built-in annotations
  - Professional editing tools
  - GIF + MP4 export

**Built-in option:**

- `Cmd+Shift+5` → Record Selection
  - Free, always available
  - Export as .mov, convert later

### Post-Production

**Text overlays:**

- **Kapwing** (Web, free tier)
- **iMovie** (macOS, free)
- **DaVinci Resolve** (Cross-platform, free)

**GIF optimization:**

```bash
brew install gifski
gifski -o demo.gif --fps 15 --quality 90 recording.mp4
```

---

## 📦 Package-Specific Demos

### [VSCode Extension](./vscode-extension/)

**Available Demos:**

- [01-basic-usage](./vscode-extension/01-basic-usage/) - Core workflow demo (30-45s)

**Planned Demos:**

- 02-rectangular-selection - Advanced column selection
- 03-multi-editor-support - VSCode + Cursor showcase
- 04-before-after-comparison - Problem/solution side-by-side

[→ View VSCode Demo Index](./vscode-extension/DEMO-SCRIPT.md)

---

## 🆕 Creating New Demos

### For Existing Packages

Add a new scenario to an existing package directory:

```bash
# Example: Adding a new VSCode demo
mkdir demo/vscode-extension/02-new-scenario
cd demo/vscode-extension/02-new-scenario

# Create required files
touch README.md narrative.md sample-code.ts
```

**Required structure:**

- `README.md` - Setup and recording instructions
- `narrative.md` - Script and timing
- Sample file(s) - Code examples for demo

**Update the index:**
Add your demo to `vscode-extension/DEMO-SCRIPT.md`

### For New Packages

When adding demos for a new package (e.g., Neovim):

```bash
# Create package demo directory
mkdir demo/neovim-plugin
cd demo/neovim-plugin

# Create index file
touch DEMO-SCRIPT.md

# Create first demo scenario
mkdir 01-basic-usage
cd 01-basic-usage
touch README.md narrative.md sample-code.ts
```

**Then:**

1. Update this top-level README with the new package
2. Follow the same demo structure (README, narrative, samples)
3. Reference the VSCode demos as templates

---

## 📋 Demo Guidelines

These are recommendations to maintain quality and consistency. Adapt as needed for your specific demo.

### README.md Should Include

**Core elements:**

- Clear goal statement (what this demo shows)
- Duration estimate
- Setup instructions (window layout, display settings)
- Pre-recording checklist

**Nice to have:**

- Step-by-step recording guide with timing
- Suggested prompts with rationale
- Post-production tips
- Troubleshooting section

### narrative.md (Optional)

Use narrative.md for more complex demos. Consider including:

- Scene-by-scene breakdown with timestamps
- Visual descriptions of key moments
- Voiceover script (if you plan to add audio)
- Text overlay suggestions
- Alternative approaches (speed run, before/after, etc.)

**Note:** Simple demos may not need a separate narrative file - inline comments in README.md work fine.

### Sample Files

Aim for code that is:

- **Realistic** - Relatable to your target audience
- **Focused** - Demonstrates one clear concept
- **Scannable** - ~40 lines fills a screen without overwhelming
- **Contextual** - Provides natural use cases for prompts

### Demo Videos

**Technical requirements:**

- High contrast (light theme preferred for readability)
- Readable fonts (16-18px minimum)
- File size: <5MB (GIF) or <20MB (MP4)

**Content best practices:**

- Well-paced (1-2 second pauses after key actions)
- Clean workspace (no distractions, unrelated tabs)
- Call-to-action (GitHub URL visible for 3-5 seconds)
- Smooth cursor movements (deliberate, not jittery)

---

## 📊 Measuring Demo Effectiveness

### Before Publishing

Test your demo:

- [ ] Watch at 2x speed - is it still clear?
- [ ] View at mobile size - is text readable?
- [ ] Show to a colleague - do they understand without explanation?
- [ ] File size under target (<5MB GIF or <20MB MP4)

### After Publishing

Track engagement:

- **Direct metrics:** Views, likes, shares, comments
- **Traffic:** GitHub link clicks, extension downloads
- **Feedback:** Feature requests, questions, testimonials

**Use UTM parameters for tracking:**

```
https://github.com/couimet/rangeLink?utm_source=twitter&utm_medium=demo&utm_campaign=basic-usage
```

---

## 💡 Tips for Great Demos

### Do's ✅

- Show **realistic use cases** (not contrived examples)
- Use **natural language** in prompts (how you'd actually ask)
- Demonstrate **clear value** (time saved, context preserved)
- Include **call-to-action** (GitHub URL, install instructions)
- Test at **small sizes** (Twitter timeline, mobile view)

### Don'ts ❌

- Rush through actions (viewers need time to process)
- Use tiny fonts (unreadable when scaled)
- Show too many features (one demo = one idea)
- Forget to pause (key moments need emphasis)
- Skip the ending (CTA is critical for conversion)

---

## 🔗 Resources

### RangeLink Documentation

- [Main README](../README.md)
- [VSCode Extension README](../packages/rangelink-vscode-extension/README.md)
- [Architecture Overview](../docs/ARCHITECTURE.md)
- [Roadmap](../docs/ROADMAP.md)

### Demo Best Practices

- [GitHub: Awesome READMEs](https://github.com/matiassingers/awesome-readme)
- [Dev.to: Creating Engaging Code Demos](https://dev.to/)
- [Kap Documentation](https://github.com/wulkano/Kap)

### Distribution Channels

- **GitHub** - Primary location, above the fold in README
- **Twitter/X** - Use #VSCode #ClaudeCode #Developer #Productivity
- **Reddit** - r/vscode, r/programming (read rules first)
- **DEV.to** - Write accompanying article
- **YouTube** - For longer-form content (60+ seconds)

---

## 🤝 Contributing

Have a great demo idea? Follow these steps:

1. **Check existing demos** - Is your idea covered?
2. **Create the demo** - Follow the structure guidelines above
3. **Test thoroughly** - Record, review, refine
4. **Submit PR** - Include the demo in your contribution

Questions? Open an issue or reach out to the maintainers.
