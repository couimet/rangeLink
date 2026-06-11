#!/usr/bin/env bash
set -euo pipefail

# Generate a release testing landing page for the RangeLink VS Code Extension.
#
# Outputs a minimal markdown file that points at the QA GitHub issue — the issue
# is the canonical source for the per-feature pnpm test:release:grep commands.
# Frontmatter tracks version, QA issue URL, and generation timestamp.
#
# Usage:
#   ./scripts/generate-release-testing-instructions.sh             → trunk-based dev (Unreleased)
#   ./scripts/generate-release-testing-instructions.sh --version X.Y.Z  → release lock

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

VERSION_ARG=""
for arg in "$@"; do
  case "$arg" in
    --version) ;;
    *) if [[ "$arg" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then VERSION_ARG="$arg"; fi ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
MONOREPO_ROOT="$(git -C "$PACKAGE_DIR" rev-parse --show-toplevel)"
PACKAGE_JSON="$PACKAGE_DIR/package.json"
QA_DIR="$PACKAGE_DIR/qa"

PUBLISHED_VERSION=$(jq -r '.version // empty' "$PACKAGE_JSON")

if [[ -n "$VERSION_ARG" ]]; then
  NEXT_LABEL="v${VERSION_ARG}"
  BASE_NAME="release-testing-instructions-v${VERSION_ARG}"
  SCOPE_LINE="Changes from v${PUBLISHED_VERSION} → v${VERSION_ARG}"
else
  NEXT_LABEL="Unreleased"
  BASE_NAME="release-testing-instructions-unreleased"
  SCOPE_LINE="Changes from v${PUBLISHED_VERSION} → ${NEXT_LABEL}"
fi

echo -e "${GREEN}Generating release testing instructions for ${NEXT_LABEL}${NC}"

OUTPUT_FILE="$QA_DIR/${BASE_NAME}.md"

if [[ -f "$OUTPUT_FILE" ]]; then
  echo "$OUTPUT_FILE already exists — nothing to generate"
  exit 0
fi

GENERATED_TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat > "$OUTPUT_FILE" <<EOF
---
version: ${VERSION_ARG:-$PUBLISHED_VERSION}
qa_issue_url: ""
generated: ${GENERATED_TS}
---

# Release Testing: RangeLink VS Code Extension ${NEXT_LABEL}

**Scope:** ${SCOPE_LINE}
**QA tracker:** <to be filled by release:lock>

## Next steps

1. \`pnpm test\` — unit tests + coverage gate
2. Work through the QA tracker checkboxes — each row has the exact pnpm command to run
3. \`pnpm validate:qa-coverage:vscode-extension\`
4. When all checkboxes pass: \`pnpm release:prepare:vscode-extension\`
EOF

RELATIVE_PATH="${OUTPUT_FILE#"$MONOREPO_ROOT"/}"
echo -e "\n${GREEN}✓ Generated: ${RELATIVE_PATH}${NC}"
