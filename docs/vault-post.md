# I Built a VS Code Extension to Stop the Copy-Paste Madness with `claude-Code`

Hey folks! I just shipped v0.2.0 of **RangeLink**, a VS Code/Cursor extension that fixes something that's been driving me (and probably you) crazy.

## The Problem

Even though I use Cursor daily, most of my AI work happens with `claude-code` running in a terminal _inside_ Cursor. And the constant copy-pasting between terminal and editor? Exhausting.

One day, after the hundredth copy-paste, I got frustrated and just tried something: I sent `claude-code` a link like `src/path/file.rb#L42C10-L58C25` pointing to a specific code snippet.

**It just worked.** No explanation needed. Claude understood immediately.

That was the lightbulb moment: **precise code references should be universal**. Not just for AI assistants, but for code reviews, documentation, team collaboration — anywhere developers share code.

## What RangeLink Does

**Create precise code references in one keystroke.**

1. Select some code in VS Code/Cursor
2. Press `Cmd+R Cmd+L` (Mac) or `Ctrl+R Ctrl+L` (Windows/Linux)
3. Done! Link is in your clipboard: `src/path/file.rb#L42C10-L58C25`

The notation is GitHub-inspired, so your teammates already know it. They don't even need RangeLink installed to understand your links.

## The Killer Feature (v0.2.0)

**Terminal link navigation** — this is where it gets good for `claude-code` users.

You know how `claude-code` lives in your terminal? Now when you generate a RangeLink:

- The link appears directly in your terminal (zero copy-paste)
- Claude can see it and reference it
- **You** can **Cmd+Click** (Mac) or **Ctrl+Click** (Windows/Linux) any RangeLink in the terminal to jump straight to that code

No more "wait, which file was that?" or "around line 42" moments. Just click and you're there.

## Why You'll Love It

- **No more "around line 42"** — Share exact ranges with column precision
- **Works everywhere** — `claude-code`, VSCode, Cursor, GitHub, Slack, PRs
- **One keystroke** — `Cmd+R Cmd+L` → link copied, done
- **Flexible paths** — Workspace-relative or absolute paths, your choice

Perfect for:

- Code reviews ("The bug is in `api/routes.ts#L215C8-L223C45`")
- AI assistants (multi-file context in one prompt)
- Team collaboration (universal format everyone can use)

## About the Logo

Ever notice the chicken in the logo? That's a **free-range** chicken. Because your code should roam free across editors, tools, and teams.

The chains represent links — connections between developers, tools, and ideas.

Look at the numbers in the range, **precision matters**.

## Try It Out

**[Install RangeLink from the VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=couimet.rangelink-vscode-extension)**

Select some code, hit `Cmd+R Cmd+L` (or Command Palette → "Copy Range Link" if you have keybinding conflicts), and paste the link into `claude-code` or Slack. See how it feels to never say "around line X" again.

If you're a vim/neovim user interested in building a Neovim plugin, hit me up! The [core library is platform-agnostic](https://github.com/couimet/rangeLink) and designed for multi-editor support.

Would love to hear your feedback!

---

**Links:**

- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=couimet.rangelink-vscode-extension)
- [GitHub Repository](https://github.com/couimet/rangeLink)
- [Full README with origin story](https://github.com/couimet/rangeLink?tab=readme-ov-file#history)
