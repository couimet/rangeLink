# RangeLink Architecture

This document describes RangeLink's architecture, design principles, and implementation strategies for both the current TypeScript monorepo and future multi-language expansion.

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [Design Principles](#design-principles)
3. [Core Library Design](#core-library-design)
4. [Extension Layer Design](#extension-layer-design)
5. [Multi-Language Vision](#multi-language-vision)
6. [Related Documentation](#related-documentation)

---

## Current Architecture

### Monorepo Structure

RangeLink uses a **pnpm workspace** monorepo with two primary packages:

```
rangeLink/
  packages/
    rangelink-core-ts/        # Pure TypeScript core library
      src/
        types/                # Domain models and enums
        selection/            # Selection analysis
        formatting/           # Link generation
        validation/           # Configuration validation
        parsing/              # Link parsing (future)
      tests/                  # Comprehensive test suite
      package.json

    rangelink-vscode-extension/ # VSCode extension (thin wrapper)
      src/
        extension.ts          # Extension entry point
        commands/             # Command implementations
        config/               # Configuration loading
      tests/                  # Extension-specific tests
      package.json

  docs/                       # Comprehensive documentation
  .commits/                   # Commit message templates
  README.md                   # Monorepo overview
```

**Key characteristics:**
- **Zero dependencies** in core library (pure TypeScript)
- **Platform-agnostic** core (no VSCode coupling)
- **Thin extension layer** (minimal glue code)
- **Comprehensive tests** (100% coverage target)

### Package Relationship

```
┌─────────────────────────────────┐
│ rangelink-vscode-extension      │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Commands Layer              │ │  ← User interactions
│ └──────────┬──────────────────┘ │
│            │                     │
│ ┌──────────▼──────────────────┐ │
│ │ Configuration Layer         │ │  ← VSCode settings
│ └──────────┬──────────────────┘ │
│            │                     │
│ ┌──────────▼──────────────────┐ │
│ │ Adapter Layer               │ │  ← VSCode → Core types
│ └──────────┬──────────────────┘ │
└────────────┼────────────────────┘
             │ depends on
┌────────────▼────────────────────┐
│ rangelink-core-ts               │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Formatting (Link Builder)   │ │  ← Generate links
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Selection Analysis          │ │  ← Rectangular detection
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Validation                  │ │  ← Config validation
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Domain Models               │ │  ← Types, enums
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

---

## Design Principles

### 1. Platform-Agnostic Core

**Principle:** Core library has zero platform dependencies.

**Rationale:** Enables reuse across editors, tools, and languages.

**Implementation:**
- Core library defines its own `Selection` interface
- No imports from `vscode` namespace
- Extension provides adapter layer: `vscode.Selection` → `core.Selection`

**Example:**
```typescript
// ❌ BAD: Core library coupled to VSCode
import { Selection } from 'vscode';

export function formatLink(selection: Selection): string {
  // Tightly coupled to VSCode types
}

// ✅ GOOD: Core library platform-agnostic
export interface Selection {
  readonly startLine: number;
  readonly startChar: number;
  readonly endLine: number;
  readonly endChar: number;
}

export function formatLink(selection: Selection): string {
  // Works with any editor's selection type
}
```

### 2. Zero Dependencies

**Principle:** Core library has zero runtime dependencies.

**Rationale:** Minimize bundle size, maximize portability, reduce security surface.

**Current dependencies:**
- **Core:** None (only `typescript` as devDependency)
- **Extension:** Only `rangelink-core-ts` (and VSCode engine)

**Benefits:**
- 📦 Small bundle size (~50KB core library)
- 🔒 No supply chain vulnerabilities
- 🚀 Fast installation
- 🔄 Easy to port to other languages

### 3. Comprehensive Testing

**Principle:** 100% branch coverage target with comprehensive test suites.

**Coverage targets:**
- Core library: 100% branch coverage
- Extension: 90%+ coverage

**Test organization:**
```
tests/
  unit/                       # Unit tests (isolated)
  integration/                # Integration tests (multi-component)
  fixtures/                   # Test data and helpers
```

**Test categories:**
- ✅ Happy path (standard use cases)
- ✅ Edge cases (empty, boundary values)
- ✅ Error conditions (validation failures)
- ✅ Custom configurations (all delimiter combinations)
- ✅ BYOD parsing (portable links)

### 4. Structured Logging

**Principle:** All messages use stable error codes for i18n readiness.

**Format:** `[LEVEL] [CODE] message`

**Example:**
```typescript
[INFO] [MSG_1001] Configuration loaded: line="L", column="C"
[ERROR] [ERR_1005] Invalid delimiterLine value "L~" (reserved character '~')
```

**Benefits:**
- 🌍 i18n-ready (codes map to translations)
- 🔍 Searchable (unique codes)
- 📊 Analytics-friendly (aggregate by code)

See [LOGGING.md](./LOGGING.md) for complete logging specification.

### 5. Incremental Development

**Principle:** Micro-iterations (1-2 hours) with clear scope and "done when" criteria.

**Workflow:**
1. Define iteration scope (what IS and IS NOT included)
2. Estimate time (1-2 hours)
3. Implement with tests
4. Commit with descriptive message
5. Move to next iteration

**Benefits:**
- 🎯 Prevents scope creep
- 📈 Natural progress tracking
- 🔄 Easy to pause/resume
- 📝 Clean git history

See [ROADMAP.md](./ROADMAP.md) for detailed iteration planning.

---

## Core Library Design

### Domain Models

**Location:** `packages/rangelink-core-ts/src/types/`

**Key types:**

```typescript
// Selection.ts - Platform-agnostic selection
export interface Selection {
  readonly startLine: number;  // 1-indexed
  readonly startChar: number;  // 0-indexed
  readonly endLine: number;    // 1-indexed
  readonly endChar: number;    // 0-indexed
}

// RangeLinkConfig.ts - Delimiter configuration
export interface RangeLinkConfig {
  readonly delimiterLine: string;      // Default: "L"
  readonly delimiterPosition: string;  // Default: "C"
  readonly delimiterHash: string;      // Default: "#"
  readonly delimiterRange: string;     // Default: "-"
}

// HashMode.ts - Selection mode
export enum HashMode {
  Normal = 'Normal',              // Single hash: #
  RectangularMode = 'RectangularMode',  // Double hash: ##
}

// RangeLinkMessageCode.ts - Structured logging codes
export enum RangeLinkMessageCode {
  CONFIG_LOADED = 'MSG_1001',
  CONFIG_ERR_DELIMITER_EMPTY = 'ERR_1002',
  // ... more codes
}
```

### Selection Analysis

**Location:** `packages/rangelink-core-ts/src/selection/`

**Purpose:** Determine if selections form a rectangular selection.

**Algorithm:**
```typescript
export function isRectangularSelection(selections: ReadonlyArray<Selection>): boolean {
  // Need at least 2 selections
  if (selections.length < 2) return false;

  // All selections must have:
  // 1. Same start column
  // 2. Same end column
  // 3. Consecutive line numbers (no gaps)

  const firstSelection = selections[0];
  const expectedStartChar = firstSelection.startChar;
  const expectedEndChar = firstSelection.endChar;

  for (let i = 0; i < selections.length; i++) {
    const selection = selections[i];

    // Check column consistency
    if (
      selection.startChar !== expectedStartChar ||
      selection.endChar !== expectedEndChar
    ) {
      return false;
    }

    // Check line consecutiveness (except first)
    if (i > 0) {
      const previousSelection = selections[i - 1];
      if (selection.startLine !== previousSelection.startLine + 1) {
        return false;
      }
    }
  }

  return true;
}
```

**Test coverage:**
- ✅ Single selection (false)
- ✅ Two selections, same columns, consecutive lines (true)
- ✅ Multiple selections, same columns, consecutive lines (true)
- ✅ Different start columns (false)
- ✅ Different end columns (false)
- ✅ Non-consecutive lines (false)
- ✅ Empty selections array (false)

### Link Formatting

**Location:** `packages/rangelink-core-ts/src/formatting/`

**Purpose:** Generate RangeLink strings from selections and configuration.

**Key function:**
```typescript
export function formatLink(
  path: string,
  selections: ReadonlyArray<Selection>,
  config: RangeLinkConfig,
  options: { portable?: boolean; absolutePath?: boolean } = {}
): string {
  // 1. Determine hash mode (normal vs rectangular)
  const hashMode = isRectangularSelection(selections)
    ? HashMode.RectangularMode
    : HashMode.Normal;

  // 2. Normalize selection (use first if multiple, non-rectangular)
  const selection = normalizeSelection(selections, hashMode);

  // 3. Format range part
  const rangePart = formatRange(selection, config);

  // 4. Add hash prefix (single or double)
  const hashPrefix =
    hashMode === HashMode.RectangularMode
      ? config.delimiterHash.repeat(2)  // ##
      : config.delimiterHash;           // #

  // 5. Optionally add BYOD metadata
  const byodSuffix = options.portable
    ? formatBYODMetadata(config, selection)
    : '';

  return `${path}${hashPrefix}${rangePart}${byodSuffix}`;
}
```

**Link format examples:**
- Single line: `path#L42`
- Multi-line: `path#L10-L20`
- With columns: `path#L10C5-L20C10`
- Rectangular: `path##L10C5-L20C10`
- Portable: `path#L10C5-L20C10~#~L~-~C~`

See [LINK-FORMATS.md](./LINK-FORMATS.md) for complete format specification.

### Configuration Validation

**Location:** `packages/rangelink-core-ts/src/validation/`

**Purpose:** Validate delimiter configuration and provide error codes.

**Validation rules:**
1. ✅ Not empty (min 1 character)
2. ✅ No digits (0-9)
3. ✅ No whitespace (spaces, tabs, newlines)
4. ✅ No reserved characters (`~`, `|`, `/`, `\`, `:`, `,`, `@`)
5. ✅ Unique (case-insensitive)
6. ✅ No substring conflicts (case-insensitive)
7. ✅ Hash single character (for local config only)

**Error codes:**
- `ERR_1002` - DELIMITER_EMPTY
- `ERR_1003` - DELIMITER_DIGITS
- `ERR_1004` - DELIMITER_WHITESPACE
- `ERR_1005` - DELIMITER_RESERVED
- `ERR_1006` - DELIMITER_NOT_UNIQUE
- `ERR_1007` - DELIMITER_SUBSTRING_CONFLICT
- `ERR_1008` - HASH_NOT_SINGLE_CHAR

See [ERROR-HANDLING.md](./ERROR-HANDLING.md) for complete validation specification.

### BYOD (Portable Links)

**Location:** `packages/rangelink-core-ts/src/byod/` (future)

**Purpose:** Generate and parse portable links with embedded delimiter metadata.

**Format:**
```
path#L10C5-L20C10~#~L~-~C~
                 └─┬──┘ Metadata
                   └── Separators: ~ (fixed)
```

**Generation:**
```typescript
export function formatBYODMetadata(
  config: RangeLinkConfig,
  selection: Selection
): string {
  const hasColumns =
    selection.startChar !== undefined && selection.endChar !== undefined;

  if (hasColumns) {
    // 4-field format: ~hash~line~range~position~
    return `~${config.delimiterHash}~${config.delimiterLine}~${config.delimiterRange}~${config.delimiterPosition}~`;
  } else {
    // 3-field format: ~hash~line~range~
    return `~${config.delimiterHash}~${config.delimiterLine}~${config.delimiterRange}~`;
  }
}
```

**Parsing:** (Phase 2 roadmap item)
- Detect `~` separator
- Extract metadata fields
- Validate embedded delimiters
- Parse link using embedded delimiters (ignore local config)
- Handle missing position delimiter (recovery)
- Handle rectangular mode (double hash detection)

See [BYOD.md](./BYOD.md) for complete BYOD specification.

---

## Extension Layer Design

### Adapter Pattern

**Problem:** VSCode types are not platform-agnostic.

**Solution:** Adapter layer converts VSCode types to core types.

**Implementation:**
```typescript
// extension.ts
import * as vscode from 'vscode';
import { formatLink, Selection as CoreSelection } from 'rangelink-core-ts';

function adaptSelection(vscodeSelection: vscode.Selection): CoreSelection {
  return {
    startLine: vscodeSelection.start.line + 1, // VSCode is 0-indexed
    startChar: vscodeSelection.start.character,
    endLine: vscodeSelection.end.line + 1,
    endChar: vscodeSelection.end.character,
  };
}

export function copyLinkCommand(
  editor: vscode.TextEditor,
  config: RangeLinkConfig
): void {
  const selections = editor.selections.map(adaptSelection);
  const path = vscode.workspace.asRelativePath(editor.document.uri);

  const link = formatLink(path, selections, config);

  vscode.env.clipboard.writeText(link);
  vscode.window.showInformationMessage('Link copied to clipboard!');
}
```

**Benefits:**
- ✅ Core library remains platform-agnostic
- ✅ Easy to add adapters for other editors
- ✅ Clear separation of concerns

### Configuration Loading

**Implementation:**
```typescript
// config/loadConfig.ts
import * as vscode from 'vscode';
import { RangeLinkConfig, validateConfig } from 'rangelink-core-ts';

export function loadConfig(): RangeLinkConfig {
  const vscodeConfig = vscode.workspace.getConfiguration('rangelink');

  const config: RangeLinkConfig = {
    delimiterLine: vscodeConfig.get('delimiterLine', 'L'),
    delimiterPosition: vscodeConfig.get('delimiterPosition', 'C'),
    delimiterHash: vscodeConfig.get('delimiterHash', '#'),
    delimiterRange: vscodeConfig.get('delimiterRange', '-'),
  };

  // Validate using core library
  const validationResult = validateConfig(config);

  if (!validationResult.isValid) {
    // Log errors to output channel
    validationResult.errors.forEach((error) => {
      outputChannel.appendLine(`[ERROR] [${error.code}] ${error.message}`);
    });

    // Fall back to defaults
    return getDefaultConfig();
  }

  return config;
}
```

### Command Registration

**Implementation:**
```typescript
// extension.ts
export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel('RangeLink');

  // Register commands
  const commands = [
    {
      id: 'rangelink.copyLinkToSelectionWithRelativePath',
      handler: createCopyLinkCommand({ portable: false, absolute: false }),
    },
    {
      id: 'rangelink.copyPortableLinkToSelectionWithRelativePath',
      handler: createCopyLinkCommand({ portable: true, absolute: false }),
    },
    // ... more commands
  ];

  commands.forEach((command) => {
    const disposable = vscode.commands.registerCommand(
      command.id,
      command.handler
    );
    context.subscriptions.push(disposable);
  });
}
```

---

## Multi-Language Vision

### The Challenge

When RangeLink expands to support multiple languages (TypeScript, Java, C/C++, Rust, Go) and multiple editors (VSCode, Neovim, IntelliJ, Xcode), how do we:

1. **Ensure feature parity** across all implementations?
2. **Enforce consistency** when adding new features?
3. **Scale development** without duplicating effort?
4. **Maintain quality** across all implementations?

### Solution: Specification-First + Contract Testing

**Core principles:**
1. **Single Source of Truth** - Specification defines behavior, not implementations
2. **Contract-Driven** - All implementations pass same contract tests
3. **Language-Agnostic Contracts** - Test cases defined in JSON, executable in any language
4. **CI Enforcement** - Feature parity is not optional; CI fails if implementations diverge

### Specification-Driven Architecture

```
rangeLink/
  spec/                           # Specification hub
    schema/
      range-link.schema.json      # Data structure definitions
      selection.schema.json
      config.schema.json
    contracts/                    # Behavioral contracts
      build-link/
        single-line.json          # Test cases for single-line links
        multi-line.json
        rectangular-mode.json
        portable.json
      parse-link/
        all-formats.json
        error-handling.json
      validation/
        delimiter-validation.json
    docs/
      specification.md            # Human-readable spec

  packages/
    rangelink-core-ts/            # TypeScript implementation
      src/ ... tests/contracts/   # Runs spec/contracts/**/*.json

    rangelink-core-java/          # Java implementation
      src/ ... tests/contracts/   # Runs same contracts

    rangelink-core-rust/          # Rust implementation
      src/ ... tests/contracts/   # Runs same contracts

    rangelink-vscode-extension/   # VSCode (uses TypeScript core)
    rangelink-neovim/             # Neovim (uses Rust core or FFI)
    rangelink-intellij/           # IntelliJ (uses Java core)
```

### Contract Test Example

**Specification (JSON):**
```json
// spec/contracts/build-link/rectangular-mode.json
{
  "name": "rectangular_mode_selection",
  "testCases": [
    {
      "name": "simple_rectangular_selection",
      "input": {
        "path": "src/file.ts",
        "selections": [
          { "line": 10, "startChar": 5, "endChar": 10 },
          { "line": 11, "startChar": 5, "endChar": 10 },
          { "line": 12, "startChar": 5, "endChar": 10 }
        ],
        "config": {
          "delimiterLine": "L",
          "delimiterPosition": "C",
          "delimiterHash": "#",
          "delimiterRange": "-"
        }
      },
      "expected": {
        "link": "src/file.ts##L10C6-L12C11",
        "isRectangularMode": true
      }
    }
  ]
}
```

**TypeScript implementation:**
```typescript
// packages/rangelink-core-ts/tests/contracts/test-build-link.ts
describe('Contract: Rectangular Mode', () => {
  const contract = loadContract('build-link/rectangular-mode.json');

  contract.testCases.forEach((testCase) => {
    it(testCase.name, () => {
      const result = formatLink(
        testCase.input.path,
        testCase.input.selections,
        testCase.input.config
      );

      expect(result).toBe(testCase.expected.link);
    });
  });
});
```

**Java implementation:**
```java
// packages/rangelink-core-java/src/test/java/ContractTests.java
@ParameterizedTest
@JsonSource("../../../../spec/contracts/build-link/rectangular-mode.json")
public void testRectangularMode(Contract contract) {
    for (TestCase testCase : contract.getTestCases()) {
        String result = RangeLinkBuilder.formatLink(
            testCase.getInput().getPath(),
            testCase.getInput().getSelections(),
            testCase.getInput().getConfig()
        );

        assertEquals(testCase.getExpected().getLink(), result);
    }
}
```

**Both implementations must pass the same contract tests. CI enforces this.**

### CI Enforcement

```yaml
# .github/workflows/validate-parity.yml
name: Validate Feature Parity

on: [push, pull_request]

jobs:
  validate-parity:
    strategy:
      matrix:
        implementation:
          - rangelink-core-ts
          - rangelink-core-java
          - rangelink-core-rust
    steps:
      - run: |
          cd packages/${{ matrix.implementation }}
          npm run test:contracts  # or mvn test, cargo test
      - run: ./tools/validate-parity.sh
        # Fails if ANY implementation fails ANY contract
```

### Development Workflow

**Adding a new feature:**

1. **Define in specification:**
   - Add JSON Schema for new data structures
   - Add contract tests for new behavior
   - Update human-readable spec docs

2. **All implementations must pass:**
   - Update TypeScript core → run contract tests
   - Update Java core → run contract tests
   - Update Rust core → run contract tests
   - CI fails if any implementation doesn't pass

3. **Extensions selectively expose:**
   - VSCode extension exposes features supported by VSCode API
   - Neovim plugin exposes features supported by Neovim API
   - Core library supports everything, extensions pick what they need

### Benefits

1. ✅ **Feature parity guaranteed** - CI enforces it
2. ✅ **Faster development** - Write spec once, implement in multiple languages
3. ✅ **Better testing** - Shared contracts = comprehensive coverage
4. ✅ **Clear documentation** - Spec serves as living documentation
5. ✅ **Platform flexibility** - Extensions expose what their platform supports
6. ✅ **Scalability** - Easy to add new languages/IDEs

See [architecture-multi-language.md](./architecture-multi-language.md) for complete multi-language specification.

---

## Related Documentation

- **[LINK-FORMATS.md](./LINK-FORMATS.md)** - Link format specifications and parsing rules
- **[ERROR-HANDLING.md](./ERROR-HANDLING.md)** - Error codes and validation rules
- **[BYOD.md](./BYOD.md)** - Portable links specification
- **[LOGGING.md](./LOGGING.md)** - Structured logging approach
- **[ROADMAP.md](./ROADMAP.md)** - Development roadmap and iteration planning

---

**Version:** 0.1.0
**Last Updated:** 2025-01-31
**Status:** Current architecture for RangeLink v0.1.0
