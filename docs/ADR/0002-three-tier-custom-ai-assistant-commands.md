# ADR-0002: Three-Tier Custom AI Assistant Commands

- **Status:** Accepted
- **Date:** 2026-04-01
- **Deciders:** @couimet

## Context

RangeLink's "paste to destination" feature supports AI assistant panels (Cursor, Claude Code, Copilot) by executing focus commands, writing the link to clipboard, and running VS Code paste commands. This works because these assistants use native VS Code input elements where `editor.action.clipboardPasteAction` reaches the cursor.

Webview-based AI assistants break this model. Their input fields live inside a webview iframe, so VS Code paste commands never reach the textarea. The user sees the panel focus but the link silently fails to paste. The existing single-tier `focusCommands` array in `customAiAssistants` config cannot express the distinction between "focus where paste commands work" and "focus where paste commands don't work."

Additionally, some extensions may eventually expose direct text-insertion commands that accept text as an argument, bypassing the clipboard entirely. The config schema needs to accommodate this future capability without breaking changes.

## Decision

Custom AI assistants define up to three optional command arrays, tried in priority order. At least one must be present and non-empty. Field names describe what **RangeLink does**, not what the target extension does — making the config self-documenting.

```json
{
  "extensionId": "acme.spark-ai",
  "extensionName": "Spark AI",
  "insertCommands": ["sparkAi.insertText"],
  "focusAndPasteCommands": ["sparkAi.chatView.focus"],
  "focusCommands": ["sparkAi.chatView.focus"]
}
```

| Tier | Field                   | RangeLink behavior                               | Clipboard     |
| ---- | ----------------------- | ------------------------------------------------ | ------------- |
| 1    | `insertCommands`        | Calls command with link text as argument         | Never touched |
| 2    | `focusAndPasteCommands` | Focuses panel, writes clipboard, runs paste cmds | Preserved     |
| 3    | `focusCommands`         | Focuses panel, writes clipboard, shows toast     | Not restored  |

Tier selection happens **once at bind time** (R-D), not on every paste operation. RangeLink checks which commands are registered, resolves the highest-priority tier with an available command, and caches the result for the lifetime of the binding. Subsequent operations (R-L, R-V) use the cached tier directly — no re-probing, no log noise.

Tier 1 checks command registration without executing, because insert commands accept text arguments and would cause side effects if probed without arguments. Tiers 2 and 3 execute the focus command as the probe, since focusing the panel is a useful side effect.

Users can **override built-in AI assistants** (Cursor, Claude Code, Copilot) by adding a `customAiAssistants` entry with a matching `extensionId`. RangeLink merges the user's tiers with the built-in's hardcoded commands as a safety-net fallback. If all user-configured commands fail the registration check (typos, extension not updated), the built-in commands take over. Bind-time logging reports exactly what was resolved and whether the fallback was used.

`insertCommands` entries support plain strings (text passed as first positional argument) and objects with `${content}` template interpolation for extensions that expect non-standard argument shapes.

**Confidence:**

- Three-tier schema: HIGH — validated with dummy test extension in VS Code host
- Bind-time resolution: HIGH — clear performance and UX benefit
- Built-in override with fallback: HIGH — validated with integration test using github.copilot-chat override pointing to dummy extension
- `${content}` template interpolation: MEDIUM — unit-tested, integration test with dummy extension planned

## Alternatives Considered

- Per-assistant `manualPaste: boolean` flag — rejected: flag can contradict command arrays
- Per-command `manualPaste` objects — rejected: schema complexity for no benefit
- Redefining `focusCommands` meaning from "focus + auto-paste" to "focus only" — rejected: loses Tier 2 capability for custom entries

## Consequences

### Positive

- **Works with any extension** -- the three-tier model isn't limited to AI assistants. Any VS Code extension that exposes a focus command or a text-insertion command can be integrated as a RangeLink destination via config alone.
- **Webview assistants work** -- webview-based extensions get a working paste flow via Tier 3 (manual paste toast)
- **Users don't wait for RangeLink releases** -- when an AI assistant ships new commands (e.g., a direct-insert API), users on v1.1.0+ update their config immediately instead of waiting for a RangeLink release to add support. Built-in override with fallback means the config change is safe even if the user's extension version doesn't have the new command yet.
- **Self-documenting config** -- field names communicate behavior; no boolean flags to cross-reference with docs
- **Safe overrides** -- users can experiment with built-in assistant commands without risk of breaking their setup; hardcoded fallback always exists
- **No per-operation overhead** -- bind-time resolution means paste operations are a single cached capability call

### Negative

- **Schema complexity** -- three optional arrays with an "at least one required" constraint is harder to validate and document than a single required array
- **Tier 1 awaits ecosystem adoption** -- major AI assistants don't currently expose direct text-insertion commands, so Tier 1 has no consumers today. However, the infrastructure is ready for any extension that adds one.
- **getCommands() assumption** -- Tier 1 probe assumes command registration implies command availability; a registered command could still fail at execution time
