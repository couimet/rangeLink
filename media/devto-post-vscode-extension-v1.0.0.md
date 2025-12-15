# RangeLink v1.0.0: Perfected AI Workflows + The R-Keybinding Family

<div align="center">
  <img src="https://raw.githubusercontent.com/couimet/rangeLink/main/assets/icon_large.png" alt="RangeLink Logo" width="256" />
</div>

Hey folks! **RangeLink v1.0.0** is here, and this feels like a real milestone.

If you've been following along since [v0.3.0](https://dev.to/couimet/rangelink-v030-one-keybinding-to-rule-them-all-2h01), you know RangeLink brings character-level precision to code references and seamless paste destinations for AI workflows. **v1.0.0 perfects that experience** by eliminating a major v0.3.0 pain point and expanding your choices with new features.

This isn't just a version bump — it's a commitment that RangeLink is mature, reliable, and ready for your daily workflow.

---

## What's New in v1.0.0

**🎯 Perfected Paste Destinations (Major UX Improvement)**

- Claude Code Extension and Cursor AI now **fully automatic** — no more manual Cmd+V paste!
- In v0.3.0, these destinations required you to manually paste after RangeLink copied the link. That workflow interruption is gone.
- All AI chat destinations now provide identical seamless UX: select code → link appears → keep typing.
- Remember "One Keybinding to Rule Them All"? **In v1.0.0, it truly does.**

**🤖 GitHub Copilot Chat Integration (3rd AI Chat Option)**

- Native paste destination for GitHub Copilot Chat
- Expands your AI choices: Claude, Cursor AI, or Copilot — your preference, your workflow

**⌨️ Complete R-Keybinding Family (New Commands)**

- **R-C**: Clipboard-only RangeLink generation (cross-project sharing with absolute paths, no destination unbind needed)
- **R-V**: Paste selected text directly to destination (not just links!)
- **R-J**: Jump to bound destination (no more tab hunting)

**🔄 Smart Bind with Confirmation (QoL)**

- Quick switching between destinations without manual unbind
- QuickPick dialog confirms before replacing

---

## Feature Deep-Dives

### The v0.3.0 → v1.0.0 Evolution: Fully Automatic AI Chats

**The problem in v0.3.0:**

Claude Code Extension and Cursor AI destinations worked like this:

1. Select code → `Cmd+R Cmd+L`
2. RangeLink copied link to clipboard and opened chat panel
3. **You manually pasted with Cmd+V** ← workflow interruption
4. Continue typing

It worked, but that manual paste step broke the flow. Terminal and Text Editor destinations were already fully automatic, so the inconsistency was frustrating.

**The solution in v1.0.0:**

All destinations now fully automatic:

1. Select code → `Cmd+R Cmd+L`
2. Link appears in chat automatically
3. Continue typing immediately

**How I did it (the technical bit):**

The lightbulb moment came from [PR #136](https://github.com/couimet/rangeLink/pull/136) when improving the Terminal destination. I realized `executeCommand()` could programmatically trigger actions in VSCode extensions. For Claude Code and Cursor AI (which don't expose text insertion APIs), RangeLink could:

1. Set focus to the chat panel (RangeLink was already doing this)
2. Copy link to clipboard
3. Add a small delay (50-150ms) to ensure focus is ready
4. Execute the paste command programmatically

It's a clipboard-based workaround, but from the user's perspective it's indistinguishable from true API-based insertion. The workflow is seamless, and that's what matters.

**Result:** Claude Code, Cursor AI, and Copilot Chat all provide identical automatic paste UX. Choose your AI based on preference, not workflow limitations. The v0.3.0 promise of "One Keybinding to Rule Them All" is now fully delivered.

---

### The R-Keybinding Family: R-C, R-V, R-J

All RangeLink commands start with `Cmd+R` (for **R**ange**L**ink), creating a memorable pattern. v1.0.0 completes the R-family with three new commands (R-C, R-V, R-J):

| Keybinding | Not About...                    | Actually Does                                                      |
| ---------- | ------------------------------- | ------------------------------------------------------------------ |
| **R-L**    | **R**ocket **L**eague 🎮        | Generate RangeLink at current selection                            |
| **R-C**    | **R**adio **C**ontrol 📻        | Copy RangeLink to **C**lipboard only (skip destination)            |
| **R-V**    | **R**ecreational **V**ehicle 🚐 | Paste selected text directly to destination (like **V** for paste) |
| **R-J**    | **R**oger **J**unior            | **J**ump to your currently bound destination                       |

#### R-C: RangeLink Clipboard-Only Mode

Sometimes you need a RangeLink but don't want it auto-pasting to your bound destination:

- Sharing links across projects or IDE instances
- Pasting into Slack, documentation, etc
- Validating references before sending to AI

**`Cmd+R Cmd+C`** generates a formatted RangeLink (e.g., `src/auth.ts#L42C10-L58C25`) directly to clipboard, bypassing your bound destination entirely.

**Key benefit:** No need to unbind your destination first. Generate clipboard-only links on demand while keeping your paste destination active.

Supports both relative paths (same project) and absolute paths (cross-project sharing). Use `Cmd+R Cmd+Shift+C` for absolute paths when sharing links across different projects or IDE instances.

#### R-V: Paste Text, Not Just Links 🚐

You've bound RangeLink to your terminal or AI chat, and now you want to send actual code — not a link, but the **selected text itself**.

**`Cmd+R Cmd+V`** sends your selected text directly to your bound destination. Same seamless workflow: select code → `R-V` → text appears → destination auto-focuses → keep typing.

Why the RV emoji? Well, `R-V` **is** literally a Recreational Vehicle. I couldn't resist. 🚐

**Pro tip:** Works with all destinations (Claude Code Extension, Cursor AI, GitHub Copilot Chat, Terminal, Text Editor) and handles multi-selection by concatenating with newlines. Perfect for quickly sharing code snippets with AI assistants.

#### R-J: Jump to Destination

You've bound a terminal or text editor as your paste destination, but it's buried under other tabs or panes. Instead of hunting for it, hit **`Cmd+R Cmd+J`** to instantly jump to (and focus) your bound destination.

Not about Roger Junior. Just a quick jump to where your links are going. 🎯

---

### GitHub Copilot Chat: Your 3rd AI Chat Option

v1.0.0 adds native GitHub Copilot Chat support as a paste destination, giving you three AI chat options:

- **Claude Code Extension** — Anthropic's official extension (works in VSCode and Cursor)
- **Cursor AI** — Built into Cursor IDE
- **GitHub Copilot Chat** — GitHub's AI coding assistant

All three provide identical automatic paste UX. Choose based on your AI preference, not workflow constraints.

Bind via Command Palette → "Bind RangeLink to GitHub Copilot Chat Destination"

---

### Smart Bind with Confirmation

Switching between destinations is now frictionless. Run any "Bind to..." command when already bound, and RangeLink shows a QuickPick dialog confirming the switch:

```
Currently bound to: Terminal
Switch to: Claude Code Chat?
[Yes] [No]
```

No need to unbind first—just quick switching with confirmation as your workflow demands.

---

## Why RangeLink Matters

Built-in AI features are convenient, but they lock you into one AI model, one workflow, and usually only line-level precision. RangeLink gives you:

- **Character-level precision** — Highlight exactly the function signature, the problematic condition, that one sneaky semicolon. Not the whole block. Most AI code-sharing tools only work at line-level.

- **Any AI assistant** — Claude, GPT, Gemini, Copilot, whatever you prefer. No vendor lock-in.

- **Flexible workflows** — Terminal for quick questions, scratchpad for complex prompts, direct AI chat integrations. All with the same seamless UX.

- **Universal format** — GitHub-style links that work everywhere (PRs, Slack, docs, teammates without RangeLink). RangeLinks aren't proprietary.

And with v1.0.0, the workflow is just as seamless as integrated tools — arguably better, because you're not limited to one AI vendor or workflow pattern.

---

## Try It Out

**Install RangeLink:**

- **VS Code**: [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=couimet.rangelink-vscode-extension)
- **Cursor**: [Open VSX Registry](https://open-vsx.org/extension/couimet/rangelink-vscode-extension)

**Quick start:**

1. Command Palette → "Bind RangeLink to [your preferred destination]"
2. Select code → Try the R-keybindings:
   - `Cmd+R Cmd+L` — Generate RangeLink (auto-pastes to destination)
   - `Cmd+R Cmd+C` — Clipboard-only copy (no destination paste)
   - `Cmd+R Cmd+V` — Paste selected text directly
   - `Cmd+R Cmd+J` — Jump to bound destination
3. Cmd+Click any RangeLink in terminal or editor to navigate

The text editor destination with a split-screen scratchpad is still my favorite for complex AI prompts — lets you iterate on context before sending. Give it a try!

---

## How Are You Using RangeLink?

RangeLink v1.0.0 is feature-complete and stable. The core vision is realized: character-level precision, seamless AI workflows, flexible paste destinations.

**I'd love to hear about your usage patterns:**

- Which destinations do you use most? (Terminal? Scratchpad? AI chat?)
- How are the R-keybindings fitting into your workflow?
- Any rough edges or unexpected behaviors?

Your feedback shapes priorities. If you're interested in contributing—code, docs, ideas—check out [GitHub Issues](https://github.com/couimet/rangeLink/issues) or open a discussion. The codebase is TypeScript with comprehensive test coverage, and PRs are always welcome.

Built something cool with RangeLink? Share it! Always fun to see how people are using the tool.

---

## Get Involved

If RangeLink is useful for you:

- ⭐ **Star the repo** on [GitHub](https://github.com/couimet/rangeLink)
- 🐛 **Report issues or share ideas** via [GitHub Issues](https://github.com/couimet/rangeLink/issues)
- 🤝 **Contribute** — TypeScript codebase with comprehensive test coverage, PRs welcome
- 💬 **Share your workflows** — Drop a comment below or open a discussion

---

**Links:**

- [GitHub Repository](https://github.com/couimet/rangeLink)
- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=couimet.rangelink-vscode-extension)
- [Open VSX Registry](https://open-vsx.org/extension/couimet/rangelink-vscode-extension)
- [CHANGELOG](https://github.com/couimet/rangeLink/blob/main/packages/rangelink-vscode-extension/CHANGELOG.md)
