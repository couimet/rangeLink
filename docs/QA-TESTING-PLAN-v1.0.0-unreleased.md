# RangeLink QA Testing Plan — v1.0.0 → Unreleased

**Scope:** Changes accumulated between the `vscode-extension-v1.0.0` release tag and the current `main` branch tip, as documented in the `[Unreleased]` section of `CHANGELOG.md`. This file was created at commit `a4d56b9c71be755a532af178b607d3f768363af9`.

Each release cycle should produce a new `QA-TESTING-PLAN-<version>.md` + `qa-test-cases-<version>.yaml` pair for that release window, so the test history is preserved per release.

A companion structured YAML test case file for this cycle lives at [`docs/qa-test-cases-v1.0.0-unreleased.yaml`](./qa-test-cases-v1.0.0-unreleased.yaml) (also frozen at the same commit).

## Automation Approach

### Tool Survey

The VSCode extension ecosystem offers several testing options. None provide a YAML/JSON-declarative UI automation harness — the question "can we drive tests from a YAML file?" is addressed in the **Recommendation** section below.

| Tool | What it is | YAML/JSON input? | Verdict |
| --- | --- | --- | --- |
| **`@vscode/test-cli`** | Official Microsoft tool. Downloads a pinned VS Code version, installs the extension into it, runs a Mocha/Jest test runner inside the extension host. Tests are TypeScript and can import the full `vscode` API. Replaces the older `vscode-test` package. | No — TypeScript/JavaScript only | **Recommended for future automation** |
| **`vscode-extension-tester`** (Red Hat) | Uses `selenium-webdriver` + `chromedriver` to drive VS Code's Electron shell like a browser. Supports clicking buttons, reading labels, and asserting UI state. | No — TypeScript API, not YAML | Not recommended — brittle (breaks on every VS Code UI update), slow, requires matching chromedriver version |
| **`vscode-test-web`** | Official tool for extensions that run in `vscode.dev` (the browser-based VS Code). Only applicable to web extensions. | No | Not applicable — RangeLink targets desktop VS Code |
| **`@playwright/test`** | Playwright drives web browsers. There is no official Playwright adapter for desktop VS Code extensions (only for VS Code's web-based variant). | No | Not applicable |
| **Custom YAML runner** | Build a custom harness that reads YAML definitions and executes them via `@vscode/test-cli` integration test APIs. | Yes, but you build it | High implementation cost; no ecosystem support; maintenance burden grows with each VS Code API change |

### Recommendation

For the upcoming release, use **manual testing** driven by this document. The test cases are also exported to [`docs/qa-test-cases.yaml`](./qa-test-cases.yaml) as a machine-readable list (status tracking, filtering by feature/platform) — but execution remains human-driven.

For future automation investment, the right tool is **`@vscode/test-cli`** (TypeScript integration tests). It runs inside a real VS Code process, has access to the full extension API, and is officially supported. Good candidates for automation are flows that can be verified programmatically without UI clicks (configuration changes, command execution results, status bar item state, error message codes). Pixel-level UI flows (quick-pick appearance, context menu rendering) should remain manual.

**YAML-driven automation is not feasible without building custom infrastructure from scratch.** The ecosystem does not provide it today.

---

## Test Environment

Before running any test cases, verify the following:

- VS Code version: latest stable (test against the same version used for the release)
- RangeLink extension: installed from the `.vsix` build (not from the marketplace)
- Extension settings reset to defaults before each test session unless noted otherwise
- Platform: tests marked `[mac]`, `[win]`, or `[all]` indicate platform applicability

**Keyboard shortcuts used in test cases use Mac notation (`Cmd`). Substitute `Ctrl` on Windows/Linux.**

---

<!-- S002 adds the full test case sections below this line -->
