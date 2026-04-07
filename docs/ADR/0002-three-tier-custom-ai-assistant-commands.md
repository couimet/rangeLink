# ADR-0002: Three-Tier Custom AI Assistant Commands

- **Status:** Accepted
- **Date:** 2026-04-01
- **Deciders:** @couimet

## Context

RangeLink's "paste to destination" feature supports AI assistant panels (Cursor, Claude Code, Copilot) by executing focus commands, writing the link to clipboard, and running VS Code paste commands. This works because these assistants use native VS Code input elements where `editor.action.clipboardPasteAction` reaches the cursor.

Webview-based AI assistants break this model. Their input fields live inside a webview iframe, so VS Code paste commands never reach the textarea. The user sees the panel focus but the link silently fails to paste. The existing single-tier `focusCommands` array in `customAiAssistants` config cannot express the distinction between "focus where paste commands work" and "focus where paste commands don't work."

Additionally, some extensions may eventually expose direct text-insertion commands (e.g., `sparkAi.insertText`) that accept text as an argument, bypassing the clipboard entirely. The config schema needs to accommodate this future capability without breaking changes.

## Decision

### 1. Three-tier command schema

Custom AI assistants define up to three optional command arrays, tried in priority order:

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
| 3    | `focusCommands`         | Focuses panel, writes clipboard, shows toast     | Not preserved |

At least one of the three arrays must be present and non-empty. Priority: Tier 1 > Tier 2 > Tier 3. If a higher tier's commands aren't available, the next tier is tried.

### 2. Naming convention

The field names describe what **RangeLink does**, not what the target extension does:

- `insertCommands` -- RangeLink inserts text via command argument
- `focusAndPasteCommands` -- RangeLink focuses then auto-pastes via clipboard
- `focusCommands` -- RangeLink focuses only; user pastes manually

This makes the config self-documenting: a user seeing `focusAndPasteCommands` vs `focusCommands` immediately understands the behavioral difference without reading docs.

### 3. Bind-time resolution

Tier selection happens **once at bind time** (when the user binds to a destination), not on every paste operation. The flow:

1. User binds to destination (R-D)
2. RangeLink calls `getCommands()` to get all registered VS Code commands
3. Walks tiers 1 through 3 (plus built-in fallback if applicable)
4. First tier with at least one registered command wins
5. The resolved tier is cached for the lifetime of the binding

Subsequent paste operations (R-L, R-V) use the cached tier directly. This avoids redundant async `getCommands()` calls and log noise on every paste.

### 4. Tier 1 probe strategy: getCommands() registration check

Tier 1 commands (`insertCommands`) accept text as arguments. Probing them via `executeCommand()` without arguments would trigger side effects (opening panels, inserting empty text). Instead, Tier 1 uses `getCommands()` to check whether the command is **registered** without executing it.

If insert commands aren't registered (extension too old or not installed), the next tier is tried — enabling graceful degradation without user intervention.

Tiers 2 and 3 use `executeCommand()` as the probe, since their focus commands have the useful side effect of revealing the panel.

### 5. Built-in override with fallback

Users can override built-in AI assistants (Cursor, Claude Code, Copilot) by adding a `customAiAssistants` entry with a matching `extensionId`. When an override is detected, RangeLink **merges** the user's tiers with the built-in's hardcoded commands rather than replacing them:

```
Tier 1: user's insertCommands          (getCommands check)
Tier 2: user's focusAndPasteCommands   (getCommands check)
Tier 3: user's focusCommands           (getCommands check)
Tier 4: built-in hardcoded commands    (executeCommand probe)
```

Tier 4 is the safety net. If all user-configured commands fail the probe (typos, extension not installed), the hardcoded built-in commands take over. The user's Claude Code still works -- just with built-in behavior instead of their custom tier. Bind-time logging reports exactly which commands were tried and what was resolved.

### 6. ${content} template interpolation for insertCommands

`insertCommands` entries support two forms to accommodate varying command argument conventions:

- **Plain string** -- `"sparkAi.insertText"` -- link text passed as first positional argument
- **Object with args** -- `{ "command": "fancy.cmd", "args": [{ "text": "${content}", "format": "markdown" }] }` -- `${content}` placeholders are recursively interpolated with the link text, then spread as positional arguments

The plain string form keeps the common case simple. The template form handles extensions that expect options objects or non-standard argument shapes, avoiding future breaking config changes.

### 7. Clipboard behavior per tier

Each tier has deterministic clipboard behavior with no flags or configuration:

- **Tier 1:** Clipboard is never touched. Text goes via command argument.
- **Tier 2:** Clipboard is written, paste commands are executed, clipboard is restored from backup. The user's clipboard content is preserved.
- **Tier 3:** Clipboard is written but **not restored**. The link must remain on the clipboard for the user's manual Cmd+V/Ctrl+V. A toast notification prompts the user to paste.

## Alternatives Considered

Several approaches were evaluated before settling on three separate command arrays: a per-assistant `manualPaste: boolean` flag (rejected -- the config shape should declare capability, not describe behavior with a flag that can contradict the command arrays), per-command `manualPaste` objects inside the array (rejected -- schema complexity with union types for no practical benefit), and redefining the existing `focusCommands` field from "focus + auto-paste" to "focus only" (rejected -- loses the ability to express Tier 2 capability for custom entries).

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
