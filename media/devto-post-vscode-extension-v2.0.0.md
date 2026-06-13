---
title: 'RangeLink 2.0.0: Bind first. Every R-* follows'
published: false
tags: ai, vscode, rangelink, productivity
cover_image:
---

# RangeLink 2.0.0: Bind first. Every R-\* follows

<div align="center">
  <img src="https://dev-to-uploads.s3.amazonaws.com/uploads/articles/7vckvmiq54wa61e8u3g9.png" alt="RangeLink Logo" width="256" />
</div>

Hey folks! Yes, it's been a while. RangeLink v1.0.0 shipped in mid-December 2025, and here we are in mid-June with v2.0.0 finally out the door.

If you were wondering whether the project went quiet, it didn't. It got busy under the hood. In v1.0.0, destinations were the place R-L sent your link. In v2.0.0, destinations carry the whole keybinding family: the new R-F and R-G route through your destination, and R-V now sends terminal selections too. A richer right-click layer sits on top of all of it. And while we were in there, we stopped silently overwriting your system clipboard.

---

## What's New in v2.0.0

### Every R-\* now routes through your destination

In v1.0.0, R-L was the star and R-V had just landed. R-L was destination-agnostic: it dropped the link on the clipboard whether or not you had a destination bound. In v2.0.0, every R-\* command except R-C sends to your bound destination. If nothing is bound yet, the destination picker opens and the operation finishes against whatever you pick. Right-click context menu entries work the same way, so you don't have to memorise a keybinding to get the same flow.

**R-V grew up.** It used to send editor selections to your bound destination. Now it also sends _terminal_ selections. Highlight some shell output, press R-V, and it goes straight to your bound destination. No more clipboard juggling to get test output into a prompt.

**R-F: Send File Path.** `R-F` sends the current file's workspace-relative path to your bound destination. `R-shift-F` sends the absolute path. Tell your AI assistant "look at this file" without typing the path or dragging the tab.

**R-G: Go to Link.** `R-G` opens a prompt; paste any RangeLink (something like `recipes/baking/chickenpie.ts#L3C14-L15C9`) and you land at that exact spot. Useful for jumping to RangeLinks your AI hands back.

### We stopped messing with your clipboard

Every prior version of RangeLink wrote to your system clipboard as a side effect of nearly every operation. Even when the clipboard was just the transport to a destination, whatever you had copied before was gone. Slack message in your clipboard and you press R-L? Replaced. Text you were about to paste somewhere else? Gone.

v2.0.0 introduces the `rangelink.clipboard.preserve` setting (default `"always"`). RangeLink now snapshots your clipboard before each transport operation and restores it afterward. Your clipboard only changes when _you_ ask for it: R-C or R-shift-C. If you preferred the old behaviour, set the preference to `"never"`.

### One picker, one menu: R-D and R-M

In v1.0.0, binding meant running a separate command for each destination type ("Bind to Terminal," "Bind to Claude Code," "Bind to Cursor AI").

**R-D: Bind to Destination.** One keybinding opens a single picker showing every available destination: AI assistants (built-in and any custom ones you've configured), terminals, and open files. AI assistants appear in a fixed order. Terminals and open files follow — if one of those is bound, it's pinned to the top of its section.

![Bind to destination](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/2a7kmra05v6mp2ovm8r1.png)

**R-M: RangeLink Menu.** Groups jump-to-bound, unbind, go-to-link, and show-version into one menu. Open the menu from the keybinding or by clicking the RangeLink item in the status bar. That status bar item now reflects your bind state: prominent colour when bound, with a tooltip naming the destination.

![RangeLink menu](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/ypgob01gdmz1dyg5714o.png)

> Don't want to memorize both R-D and R-M? R-M alone gets you far — when nothing is bound, it also lists available destinations so you can bind right from the menu.

### Bring Your Own AI

RangeLink already had **BYOD** (Bring Your Own Delimiters) for cross-config link compatibility. v2.0.0 adds **BYOA** (Bring Your Own AI): a universal connector that turns any focus-friendly VS Code or Cursor extension into a RangeLink destination.

A new `rangelink.customAiAssistants` setting lets you point RangeLink at any such extension. You name the extension, list its commands, and RangeLink wires it into the R-D picker. The setting supports three command tiers: direct text insert, focus plus auto-paste, or focus plus manual paste. The configured assistants are shape-validated at startup; the first time you use one, RangeLink picks the highest-priority tier whose commands are actually registered in your session.

A minimal config for a hypothetical extension `acme.powerful-ai-extension` that exposes a direct-insert command:

```json
"rangelink.customAiAssistants": [
  {
    "extensionId": "acme.powerful-ai-extension",
    "extensionName": "Powerful AI",
    "insertCommands": ["powerfulAi.insertText"]
  }
]
```

If the extension exposes a focus-and-paste command instead of a direct insert, swap `insertCommands` for `focusAndPasteCommands`. If it only exposes a focus command, use `focusCommands` and RangeLink will handle the paste step itself. You can list all three on the same entry as fallbacks; RangeLink picks the highest tier whose commands are actually registered.

The same setting lets you override the built-in mappings for Claude Code, Gemini, Cursor AI, or Copilot. That matters less for the rare command rename and more for the case where an extension ships a new command RangeLink doesn't know about yet. You don't have to wait for a RangeLink release to start using it.

### Gemini Code Assist, built in

The fourth built-in lands too. The full built-in lineup is now Claude Code, Gemini Code Assist, Cursor AI, and GitHub Copilot Chat. No setup beyond installing the Gemini extension itself, and it shows up in the R-D picker alongside the others.

### Right-click works everywhere now

New context menus in Explorer, Editor Tab, Editor Content, Terminal Tab, and Terminal Content. Each menu shows the actions that make sense for what you right-clicked: Send RangeLink, Send Portable Link, Send Selected Text, Send File Path, Bind Here, Unbind.

One worth singling out: **right-click any file in the Explorer**, pick "Send Relative File Path" (or "Send File Path" for the absolute version), and it goes straight to your bound destination. The file doesn't have to be open. R-F covers the current file; the Explorer entry covers _any_ file in your workspace. Bind RangeLink to your preferred AI tool and you can dump file paths into your prompt about as fast as you can right-click.

![Explorer right-click menu](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/ggngspjpkyjjq6stv0wp.png)

### You'll know when there's a new version

VS Code itself shows a "What's New" tab for editor releases, but extensions auto-update silently in the background. RangeLink v2.0.0 closes that gap with a once-per-upgrade toast: "What's New" opens the release notes, "Skip for this version" silences it for the current release. Dismiss without acting and it quietly reappears next time the extension activates, until you actually click one of the buttons. No nagging.

---

## The R-Keybinding Family in v2.0.0

| Keybinding | Letter                    | Uses bound destination | Does                                                        |
| ---------- | ------------------------- | ---------------------- | ----------------------------------------------------------- |
| **R-L**    | **L** for **L**ink        | ✓                      | Generate a RangeLink at the current selection               |
| **R-V**    | **V** for paste           | ✓                      | Send selected text from editor or terminal                  |
| **R-F**    | **F** for **F**ile        | ✓                      | Send the current file's path                                |
| **R-C**    | **C** for **C**lipboard   | —                      | Copy a RangeLink to clipboard only                          |
| **R-D**    | **D** for **D**estination | binds it               | Open the destination picker                                 |
| **R-M**    | **M** for **M**enu        | acts on it             | Open the RangeLink menu (jump, unbind, go to link, version) |
| **R-J**    | **J** for **J**ump        | focuses it             | Focus your currently bound destination                      |
| **R-G**    | **G** for **G**o to link  | independent            | Paste a RangeLink and jump straight to it                   |
| **R-U**    | **U** for **U**nbind      | unbinds it             | Unbind the current destination                              |


---

## Upgrading from v1.0.0

A few things to know:

- **Your clipboard is no longer collateral damage.** Anything you copied before pressing R-L, R-F, or R-V is still there afterwards. Set `rangelink.clipboard.preserve` to `"never"` if you preferred the old behaviour.
- **Every R-\* command now routes through your bound destination.** R-L, R-V, and R-F all send to whatever you've bound. If nothing is bound when you press one, RangeLink prompts you to pick a destination instead of writing silently to the clipboard.
- **Binding gets a keybinding: R-D.** In v1.0.0, binding was only available through the command palette. R-D opens a unified destination picker so you can bind without hunting through menus.

---

## Try it out

**Install:**

- VS Code: [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=couimet.rangelink-vscode-extension)
- Cursor: [Open VSX Registry](https://open-vsx.org/extension/couimet/rangelink-vscode-extension)
- Project home: [ouimet.info/projects/rangelink-extension.html](https://ouimet.info/projects/rangelink-extension.html)

**Quick start:**

1. Press R-D and pick a destination from the list
2. Select some code, press R-L, and your RangeLink lands in the destination
3. Press R-F to send the current file's path
4. Highlight some terminal output and press R-V to send it
5. Right-click any file in the Explorer and pick "Send Relative File Path" (no need to open it first)

---

## So why did it take six months?

Every feature above touches foundational layers. R-D pulled the separate bind commands into a single picker and made every R-\* (except R-C) demand a bound destination instead of falling through to the clipboard. BYOA changed the command-dispatch path that most of the existing tests already ran through, which meant a lot of assertions had to be retraced. And clipboard preservation touched every R-\* command that used the clipboard as a transport step. The unit tests that carried v1.0.0 were solid, but they were not going to catch a regression in any of those.

So I built a real integration-test harness first. Over 290 integration tests across more than 30 suite files, all running inside an actual VS Code host with live terminals, editor groups in different layouts, and AI extensions pre-installed for the runner (Claude Code, Gemini Code Assist). Roughly two-thirds are fully automated, another third are human-in-the-loop "assisted" tests for flows VS Code's automation API can't drive on its own, and a handful are still manual.

It's the testing harness I wish I'd had when v1.0.0 shipped. It's also the reason I kept pushing the release date out: I wanted to be able to look at the v2.0.0 release notes and trust them.

That's what I've been cooking. It's finally yours.

---

## Happy (Range) Linking!

If RangeLink is useful to you, star the [GitHub repo](https://github.com/couimet/rangeLink) and report issues or ideas via [GitHub Issues](https://github.com/couimet/rangeLink/issues).


**Links:**

- [GitHub Repository](https://github.com/couimet/rangeLink)
- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=couimet.rangelink-vscode-extension)
- [Open VSX Registry](https://open-vsx.org/extension/couimet/rangelink-vscode-extension)
- [Project Home](https://ouimet.info/projects/rangelink-extension.html)
- [CHANGELOG](https://github.com/couimet/rangeLink/tree/main/packages/rangelink-vscode-extension/CHANGELOG.md#200)

**About the author** — [Charles Ouimet](https://ouimet.info) is a Principal Software Developer in Montréal. He builds tools like RangeLink to fix the annoyances he runs into himself, balancing distributed systems by day with questionable side-project decisions by night. If something here helped you, coffee's always appreciated.

<a href="https://www.buymeacoffee.com/couimet" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: 41px !important;width: 174px !important;"></a>
