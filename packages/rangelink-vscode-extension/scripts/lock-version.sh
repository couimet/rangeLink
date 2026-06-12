#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/lock-version.sh X.Y.Z
#
# Soft-locks the deferred "Unreleased" version to a SemVer so QA can begin
# against a concrete version number.
#
# Steps:
#   1. Bump package.json .version → X.Y.Z
#   2. Regenerate versioned release testing instructions
#
# Idempotent — safe to re-run after adding bug-fix TCs to the QA YAML.
# On re-run, prints a summary and exits cleanly.
#
# Requires: jq

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

VERSION="${1:-}"
if [[ -z "$VERSION" ]]; then
  echo -e "${RED}Usage: $0 <version>${NC}" >&2
  echo "Example: $0 2.0.0" >&2
  exit 1
fi

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo -e "${RED}Error: version must be SemVer (X.Y.Z), got '$VERSION'${NC}" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(git -C "$PACKAGE_DIR" rev-parse --show-toplevel)"
PACKAGE_JSON="$PACKAGE_DIR/package.json"
QA_DIR="$PACKAGE_DIR/qa"
VERSIONED_INSTRUCTIONS="$QA_DIR/release-testing-instructions-v${VERSION}.md"

# --- Validation ---

source "$SCRIPT_DIR/check-dirty-tree.sh"
check_dirty_tree "$REPO_ROOT"

PUBLISHED_VERSION=$(jq -r '.version // empty' "$PACKAGE_JSON")
if [[ -z "$PUBLISHED_VERSION" ]]; then
  echo -e "${RED}Error: version not set in $PACKAGE_JSON${NC}" >&2
  exit 1
fi

# --- Idempotency: detect already-locked state ---

if [[ "$PUBLISHED_VERSION" == "$VERSION" ]] && [[ -f "$VERSIONED_INSTRUCTIONS" ]]; then
  echo -e "${GREEN}Already locked at v${VERSION}. Nothing to do.${NC}"
  exit 0
fi

# --- Step 1: Bump .version ---

CURRENT_VERSION=$(jq -r '.version // empty' "$PACKAGE_JSON")
if [[ "$CURRENT_VERSION" == "$VERSION" ]]; then
  echo -e "${YELLOW}Step 1: .version already ${VERSION} — skipped.${NC}"
else
  jq --arg v "$VERSION" '.version = $v' "$PACKAGE_JSON" > "$PACKAGE_JSON.tmp"
  mv "$PACKAGE_JSON.tmp" "$PACKAGE_JSON"
  echo -e "${GREEN}Step 1: Bumped .version ${CURRENT_VERSION} → ${VERSION}${NC}"
fi

# --- Step 2: Regenerate versioned release testing instructions ---

if [[ -f "$VERSIONED_INSTRUCTIONS" ]]; then
  echo -e "${YELLOW}Step 2: ${VERSIONED_INSTRUCTIONS} already exists — skipped.${NC}"
else
  "$SCRIPT_DIR/generate-release-testing-instructions.sh" --version "$VERSION"

  # PUBLISHED_VERSION is the pre-bump version (read before step 1), so the
  # scope line captures the correct range (e.g. "Changes from v1.0.0 → v2.0.0").
  sed -i.bak \
    -e "s|Changes from v[0-9.]* → .*|Changes from v${PUBLISHED_VERSION} → v${VERSION}|" \
    "$VERSIONED_INSTRUCTIONS" && rm -f "${VERSIONED_INSTRUCTIONS}.bak"

  echo -e "${GREEN}Step 2: Generated release-testing-instructions-v${VERSION}.md${NC}"
fi

echo ""
echo -e "${GREEN}Locked at v${VERSION}. QA can now begin against a concrete version.${NC}"
