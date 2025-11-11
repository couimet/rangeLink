# I Built a VS Code Extension to Stop the Copy-Paste Madness

Hey devs! I just shipped v0.2.1 of [**RangeLink**](https://github.com/couimet/rangeLink/tree/main/packages/rangelink-vscode-extension), a VS Code/Cursor extension that fixes something that's been driving me (and probably you) crazy.

## The Problem

I use [Claude Code](https://www.claude.com/product/claude-code) running in a terminal _inside_ Cursor daily. And the constant copy-pasting between terminal and editor? Exhausting.

One day, after the hundredth copy-paste, I got frustrated and just tried something: I sent Claude a link like `src/path/file.rb#L42C10-L58C25` pointing to a specific code snippet.

**It just worked.** No explanation needed. Claude understood immediately.

That was the lightbulb moment: **precise code references should be universal**. Not just for AI assistants, but for code reviews, documentation, team collaboration — anywhere developers share code.

## What RangeLink Does

**Create precise code references in one keystroke.**

1. Select some code in VS Code/Cursor
2. Press `Cmd+R Cmd+L` (Mac) or `Ctrl+R Ctrl+L` (Windows/Linux)
3. Done! Link is in your clipboard: `src/path/file.rb#L42C10-L58C25`

The notation is GitHub-inspired, so your teammates already know it. They don't even need RangeLink installed to understand your links.

## The Killer Feature (v0.2.1)

**Auto-paste to terminal** — this is where it gets good for Claude Code users (or any terminal-based workflow).

One-time setup: bind your Claude Code terminal to RangeLink (Command Palette → "Bind Terminal"). Now every RangeLink you generate **automatically appears in that terminal**. No copy-paste needed. Zero. None.

Select code → hit the keybinding → the link is instantly in your terminal prompt, ready to send to Claude (or any AI assistant).

The copy-paste workflow? Gone. You stay in flow. Even if you switch between multiple terminals, links always go to your bound terminal.

**Bonus:** You can also **Cmd+Click** (Mac) or **Ctrl+Click** (Windows/Linux) any RangeLink in your terminal to jump straight back to that code. No more "wait, which file was that?" moments.

## Why You'll Love It

- **No more "around line 42"** — Share exact ranges with column precision
- **Works everywhere** — Claude Code, VS Code, Cursor, GitHub, Slack, PRs
- **One keystroke** — `Cmd+R Cmd+L` → link copied, done
- **Flexible paths** — Workspace-relative or absolute paths, your choice

Perfect for:

- Code reviews ("The bug is in `api/routes.ts#L215C8-L223C45`")
- AI assistants (multi-file context in one prompt)
- Team collaboration (universal format everyone can use)

## About the Logo

![RangeLink Logo](https://raw.githubusercontent.com/couimet/rangeLink/main/assets/icon_large.png)

Ever notice the chicken in the logo? That's a **free-range** chicken. Because your code should roam free across editors, tools, and teams.

The chains represent links — connections between developers, tools, and ideas.

Look at the numbers in the range, **precision matters**.

## Try It Out

**Install RangeLink:**

- **VS Code**: [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=couimet.rangelink-vscode-extension)
- **Cursor**: [Open VSX Registry](https://open-vsx.org/extension/couimet/rangelink-vscode-extension)

Select some code, hit `Cmd+R Cmd+L` (or Command Palette → "Copy Range Link" if you have keybinding conflicts), and paste the link into Claude Code or Slack. See how it feels to never say "around line X" again.

## Get Involved

If you find RangeLink useful, I'd love your support:

- ⭐ **Star the repo** on [GitHub](https://github.com/couimet/rangeLink) — it helps others discover it
- 🐛 **Report bugs or request features** via [GitHub Issues](https://github.com/couimet/rangeLink/issues)
- 🤝 **Contribute** — the codebase is well-documented and PR-friendly
- 🗣️ **Share your feedback** — I'm actively iterating based on what the community needs

For vim/neovim users interested in building a plugin: the [core library is platform-agnostic](https://github.com/couimet/rangeLink/tree/main/packages/rangelink-core-ts) and designed for multi-editor support. Would love to collaborate!

Curious about the implementation? Browse the [source code on GitHub](https://github.com/couimet/rangeLink) or reach out — I'm happy to chat about the architecture and design decisions.

---

**Links:**

- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=couimet.rangelink-vscode-extension)
- [GitHub Repository](https://github.com/couimet/rangeLink)
- [Full README with origin story](https://github.com/couimet/rangeLink?tab=readme-ov-file#history)
