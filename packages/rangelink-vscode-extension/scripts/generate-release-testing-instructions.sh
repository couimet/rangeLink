#!/usr/bin/env bash
set -euo pipefail

# Generate version-specific release testing instructions for the RangeLink VS Code Extension.
#
# Validates prerequisites and creates a comprehensive markdown file with copy-paste ready
# commands for the full release testing lifecycle (7 phases).
#
# Usage: ./scripts/generate-release-testing-instructions.sh
#
# Filename: qa/release-testing-instructions-v<version>[-NNN].md
# Reruns append a suffix: -001, -002, etc.
#
# Requires: jq, nextTargetVersion set in package.json
# Optional: gh CLI (authenticated), python3 with PyYAML

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
MONOREPO_ROOT="$(git -C "$PACKAGE_DIR" rev-parse --show-toplevel)"
PACKAGE_JSON="$PACKAGE_DIR/package.json"
QA_DIR="$PACKAGE_DIR/qa"

# --- Prerequisites ---

NEXT_VERSION=$(jq -r '.nextTargetVersion // empty' "$PACKAGE_JSON")
if [[ -z "$NEXT_VERSION" ]]; then
  echo -e "${RED}Error: nextTargetVersion not set in package.json — update it before running this script${NC}" >&2
  exit 1
fi

PUBLISHED_VERSION=$(jq -r '.version // empty' "$PACKAGE_JSON")

WARNINGS=""

if ! command -v gh &>/dev/null; then
  WARNINGS+="  ${YELLOW}Warning: gh CLI not found — Phase 2 (GitHub QA Issues) requires it${NC}\n"
elif ! gh auth status &>/dev/null; then
  WARNINGS+="  ${YELLOW}Warning: gh CLI not authenticated — Phase 2 (GitHub QA Issues) requires auth${NC}\n"
fi

if ! command -v python3 &>/dev/null; then
  WARNINGS+="  ${YELLOW}Warning: python3 not found — Phases 2 and 5 require it (PyYAML)${NC}\n"
elif ! python3 -c "import yaml" 2>/dev/null; then
  WARNINGS+="  ${YELLOW}Warning: PyYAML not installed — Phases 2 and 5 require it (pip3 install pyyaml)${NC}\n"
fi

echo -e "${GREEN}Generating release testing instructions for v${NEXT_VERSION}${NC}"

if [[ -n "$WARNINGS" ]]; then
  echo -e "\n${YELLOW}Prerequisites warnings (non-blocking):${NC}"
  echo -e "$WARNINGS"
fi

# --- Output file with collision suffix ---

BASE_NAME="release-testing-instructions-v${NEXT_VERSION}"
OUTPUT_FILE="$QA_DIR/${BASE_NAME}.md"

if [[ -f "$OUTPUT_FILE" ]]; then
  MAX_SUFFIX=0
  for existing in "$QA_DIR/${BASE_NAME}"-[0-9][0-9][0-9].md; do
    [[ -e "$existing" ]] || continue
    suffix="${existing%.md}"
    suffix="${suffix##*-}"
    num=$((10#$suffix))
    [[ $num -gt $MAX_SUFFIX ]] && MAX_SUFFIX=$num
  done
  NEXT_SUFFIX=$((MAX_SUFFIX + 1))
  OUTPUT_FILE="$QA_DIR/${BASE_NAME}-$(printf '%03d' "$NEXT_SUFFIX").md"
fi

# --- Generate markdown ---

cat > "$OUTPUT_FILE" <<EOF
# Release Testing Instructions: RangeLink VS Code Extension v${NEXT_VERSION}

**Generated:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Scope:** Changes from v${PUBLISHED_VERSION} → v${NEXT_VERSION}

This file contains version-specific, copy-paste ready commands for the full release testing lifecycle.
Work through each phase in order — later phases depend on earlier ones completing successfully.

---

## Phase 0: Prerequisites

Ensure your environment is ready before starting the release testing cycle.

### Node.js / pnpm

\`\`\`bash
source ~/.zshrc && nvm use && npm run enable-pnpm
node --version && pnpm --version
\`\`\`

### Verify nextTargetVersion

\`\`\`bash
jq -r '.nextTargetVersion' packages/rangelink-vscode-extension/package.json
# Should print: ${NEXT_VERSION}
\`\`\`

### gh CLI (required for Phase 2)

\`\`\`bash
gh auth status
\`\`\`

### PyYAML (required for Phases 2 and 5)

\`\`\`bash
python3 -c "import yaml; print('PyYAML OK')"
# If missing: pip3 install pyyaml
\`\`\`

---

## Phase 1: Generate QA Test Plan

Create or carry forward the QA test plan YAML for v${NEXT_VERSION}.

\`\`\`bash
pnpm generate:qa-test-plan:vscode-extension
\`\`\`

This creates \`qa/qa-test-cases-v${NEXT_VERSION}[-NNN].yaml\` by carrying forward all TCs from the previous plan with statuses reset to pending.

### AI-powered gap detection

Run the \`/qa-suggest\` skill in Claude Code to identify features in the CHANGELOG \`[Unreleased]\` section that lack test coverage.

### Review and commit

1. Review the generated YAML and any \`/qa-suggest\` recommendations
2. Append new TCs as needed (continue from the highest existing TC ID in each feature slug)
3. Commit the YAML:

\`\`\`bash
git add packages/rangelink-vscode-extension/qa/qa-test-cases-v${NEXT_VERSION}*.yaml
git commit -m "Add QA test plan for v${NEXT_VERSION}"
\`\`\`

---

## Phase 2: Create GitHub QA Issues

Generate the GitHub issue tracker (parent issue + per-section sub-issues) from the QA YAML.

### Dry run first

\`\`\`bash
pnpm generate:qa-issue:vscode-extension -- --dry-run
\`\`\`

Review the output to verify section groupings and TC counts look correct.

### Create issues

\`\`\`bash
pnpm generate:qa-issue:vscode-extension
\`\`\`

Verify on GitHub:
- Parent issue titled "QA Checklist — v${NEXT_VERSION}" exists
- One sub-issue per feature section is linked to the parent

---

## Phase 3: Run Unit Tests + Coverage

\`\`\`bash
pnpm test
\`\`\`

All tests must pass. Check coverage thresholds in the output.

---

## Phase 4: Run Integration Tests

\`\`\`bash
pnpm test:release
\`\`\`

This compiles the extension, launches a VS Code extension host, runs integration tests, and validates QA coverage (automated TC markers ↔ integration test IDs). All three stages must pass.

---

## Phase 5: QA Smoke Setup + Manual QA Pass

### Build, install, and launch

\`\`\`bash
pnpm qa:setup:vscode-extension
\`\`\`

This builds the .vsix, installs it into an isolated \`qa-test\` profile, copies settings, generates a QA checklist, and launches VS Code/Cursor with the fixture workspace.

### Settings profile switching

Switch profiles between QA passes to test different configurations:

\`\`\`bash
# Available profiles:
pnpm qa:setup:vscode-extension -- --list-profiles

# Switch to a specific profile:
pnpm qa:setup:vscode-extension -- --settings clipboard-never
pnpm qa:setup:vscode-extension -- --settings no-dirty-warning
pnpm qa:setup:vscode-extension -- --settings custom-delimiters
pnpm qa:setup:vscode-extension -- --settings terminal-picker-low
\`\`\`

### Walk through the checklist

The generated checklist is at \`qa/qa-checklist-v${NEXT_VERSION}[-NNN].txt\`.

**Suggested order:**
1. **Ready-now TCs** — no terminal setup needed, test immediately
2. **Open 1+ terminals** and bind a destination (\`R-D\`)
3. **Terminal-dependent TCs** — require a bound destination
4. **Settings-specific TCs** — switch profiles as indicated by the \`[settings: ...]\` tags

---

## Phase 6: Validate QA Coverage

\`\`\`bash
pnpm validate:qa-coverage:vscode-extension
\`\`\`

Ensures all TCs marked \`automated: true\` in the YAML have matching integration tests, and vice versa. Fix any mismatches before proceeding.

---

## Phase 7: Pre-Publish Verification

### Final checklist

- [ ] All unit tests pass (\`pnpm test\`)
- [ ] All integration tests pass (\`pnpm test:release\`)
- [ ] All manual QA TCs pass (or have documented exceptions in the QA GitHub issue)
- [ ] QA coverage validation passes (\`pnpm validate:qa-coverage:vscode-extension\`)
- [ ] CHANGELOG \`[Unreleased]\` section is complete and accurate
- [ ] README has no stale content for the new features

### Next step: publish

When all checks pass, generate the publishing instructions:

\`\`\`bash
pnpm generate:publish-instructions:vscode-extension
\`\`\`

This validates the release environment and creates a version-specific publishing guide at \`publishing-instructions/publish-vscode-extension-v${NEXT_VERSION}.md\`.
EOF

# Format with prettier
cd "$MONOREPO_ROOT"
npx prettier --write "$OUTPUT_FILE" > /dev/null 2>&1
cd "$PACKAGE_DIR"

RELATIVE_PATH="${OUTPUT_FILE#"$MONOREPO_ROOT"/}"
echo -e "\n${GREEN}✓ Generated: ${RELATIVE_PATH}${NC}"
