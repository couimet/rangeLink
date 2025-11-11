# RangeLink v0.3.0: One Keybinding to Rule Them All

<div align="center">
  <img src="https://raw.githubusercontent.com/couimet/rangeLink/main/assets/icon_large.png" alt="RangeLink Logo" width="256" />
</div>

Hey folks! Just shipped **RangeLink v0.3.0**, and I'm genuinely excited about this one.

If you caught my [previous post about v0.2.1](https://dev.to/couimet/i-built-a-vs-code-extension-to-stop-the-copy-paste-madness-3d7l), you know RangeLink started as a way to share precise code references with AI assistants in the terminal. That's still there, but v0.3.0 takes it further: **one keybinding (`Cmd+R Cmd+L`) now sends your code references anywhere you need them.**

## The Evolution

**v0.2.0** launched with terminal binding — auto-send links to your integrated terminal where AI assistants can see them — plus clickable navigation to jump back to code.

**v0.3.0** introduces **Paste Destinations** — a unified system that lets you bind RangeLink to wherever you're working: Claude Code Extension, Cursor AI, your terminal, or even a scratchpad file for drafting complex AI prompts.

Same keybinding. Different destinations. Your choice.

## Why This Matters

Here's the thing about built-in AI features in editors: they're convenient, but they lock you into one AI model, one workflow, and usually only line-level precision. RangeLink gives you:

- **Character-level precision** — Not just line 42, but `#L42C10-L58C25` (that exact function signature, that specific condition)
- **Any AI assistant** — Claude, GPT, Gemini, whatever you prefer. No vendor lock-in.
- **Flexible workflows** — Terminal for quick questions, scratchpad for complex prompts, direct AI chat integrations
- **Universal format** — GitHub-style links that work everywhere (PRs, Slack, docs, teammates without RangeLink)

The best part? **You don't give up any convenience.** Select code, hit `Cmd+R Cmd+L`, and your link appears exactly where you need it — with the same character-level precision that makes RangeLink special.

## What's New in v0.3.0

### Paste Destinations (The Big One)

Bind RangeLink to one destination at a time:

- **Claude Code Extension** — Links open Claude's chat panel (works in VSCode and Cursor)\*
- **Cursor AI** — Links open Cursor's AI chat\*
- **Terminal** — Auto-paste links for terminal-based AI assistants
- **Text Editor** — Draft complex prompts in any file (markdown, untitled, whatever)

All destinations share the same seamless UX: select code → `Cmd+R Cmd+L` → link appears at your cursor position → destination auto-focuses → keep typing.

> (\*) **FULL DISCLAIMER:** Claude Code Extension and Cursor AI destinations use a clipboard-based workaround because their APIs don't support programmatic text insertion yet (as of Nov 2025). RangeLink copies the link and opens the chat panel, but you need to paste (`Cmd+V` / `Ctrl+V`) yourself. Terminal and Text Editor destinations fully auto-paste without manual intervention.

### Editor Link Navigation

Any RangeLink in any editor file (markdown, code, untitled) is now clickable. Hover to preview, Cmd+Click to navigate.

**Use case:** You're drafting a prompt in a scratchpad file with multiple code references. Before sending to your AI assistant, you can validate each link by clicking it — makes sure you're sharing the right context.

### The "One Keybinding" Philosophy

Every AI tool has its own way to share code — different shortcuts, different formats, different workflows.

RangeLink unifies it: **`Cmd+R Cmd+L` works everywhere**, with **character-level precision everywhere**, and connects to **any AI assistant**.

_One keybinding to rule them all_.

## Why I'm Excited

This release makes RangeLink competitive with integrated AI features without sacrificing its core strengths:

- You're not locked into one AI model
- You get more precision (characters, not just lines)
- Links work universally (paste them anywhere, share with anyone)
- The workflow is just as seamless as built-in tools

And honestly? The paste destinations architecture feels like the right foundation for whatever comes next.

## Behind the Scenes: Working with AI on RangeLink

One thing I've been experimenting with: using AI assistants to help build RangeLink itself. I've progressively added instructions to [CLAUDE.md](https://github.com/couimet/rangeLink/blob/main/CLAUDE.md) to guide how Claude Code helps me develop.

A pattern I really like is the [questions template](https://github.com/couimet/rangeLink/blob/80f9432b82121161b6e227febe1afc4924b9f541/CLAUDE.md?plain=1#L64-L99). When Claude needs design decisions before implementing a feature, instead of asking questions in the terminal (which gets messy), it:

1. Saves questions to a `.txt` file in `.claude-questions/`
2. Pre-fills recommended answers when it has context
3. I edit the file with my decisions
4. Claude reads my answers and proceeds

This keeps the workflow clean and creates a record of design decisions. The questions file becomes documentation.

If you're working with AI on your projects, this pattern might be worth trying!

## Try It Out

**Install RangeLink:**

- **VS Code**: [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=couimet.rangelink-vscode-extension)
- **Cursor**: [Open VSX Registry](https://open-vsx.org/extension/couimet/rangelink-vscode-extension)

**Quick start:**

1. Command Palette → "Bind RangeLink to [your preferred destination]"
2. Select code → `Cmd+R Cmd+L` (or Command Palette → "Copy Range Link" if you have keybinding conflicts)
3. Your link is ready where you need it

Try the text editor destination with a split-screen scratchpad — it's a game-changer for complex AI prompts.

Would love to hear your feedback, especially if you're bouncing between different AI assistants!

## Get Involved

If you find RangeLink useful, I'd love your support:

- ⭐ **Star the repo** on [GitHub](https://github.com/couimet/rangeLink) — it helps others discover it
- 🐛 **Report bugs or request features** via [GitHub Issues](https://github.com/couimet/rangeLink/issues) — I've started adding ideas there, not yet organized into a roadmap but wanted to share visibility on what's on my mind
- 🤝 **Contribute** — the codebase is well-documented and PR-friendly
- 🗣️ **Share your feedback** — I'm actively iterating based on what the community needs

For vim/neovim users interested in building a plugin: the [core library is platform-agnostic](https://github.com/couimet/rangeLink/tree/main/packages/rangelink-core-ts) and designed for multi-editor support. Would love to collaborate!

---

**Links:**

- [GitHub Repository](https://github.com/couimet/rangeLink)
