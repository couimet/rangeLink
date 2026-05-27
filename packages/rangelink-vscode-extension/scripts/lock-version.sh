#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/lock-version.sh X.Y.Z
#
# Soft-locks the deferred "Unreleased" version to a SemVer so QA can begin
# against a concrete version number.
#
# Steps:
#   1. Rename qa-test-cases-unreleased.yaml → qa-test-cases-vX.Y.Z.yaml
#   2. Bump package.json .version → X.Y.Z
#   3. Regenerate versioned release testing instructions
#
# Idempotent — safe to re-run after adding bug-fix TCs to the versioned YAML.
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

# --- Validation ---

if ! git -C "$REPO_ROOT" diff-index --quiet HEAD --; then
  echo -e "${RED}Error: working tree is dirty. Commit or stash changes first.${NC}" >&2
  exit 1
fi

UNRELEASED_YAML="$QA_DIR/qa-test-cases-unreleased.yaml"
VERSIONED_YAML="$QA_DIR/qa-test-cases-v${VERSION}.yaml"

PUBLISHED_VERSION=$(jq -r '.version // empty' "$PACKAGE_JSON")
if [[ -z "$PUBLISHED_VERSION" ]]; then
  echo -e "${RED}Error: version not set in $PACKAGE_JSON${NC}" >&2
  exit 1
fi

# --- Idempotency: detect already-locked state ---

if [[ "$PUBLISHED_VERSION" == "$VERSION" ]] && [[ -f "$VERSIONED_YAML" ]]; then
  echo -e "${GREEN}Already locked at v${VERSION}. Nothing to do.${NC}"
  exit 0
fi

# --- Prerequisites ---

if [[ ! -f "$UNRELEASED_YAML" ]]; then
  if compgen -G "${QA_DIR}/qa-test-cases-v*.yaml" > /dev/null; then
    echo -e "${GREEN}A versioned YAML already exists — prior run completed.${NC}"
    exit 0
  fi
  echo -e "${RED}Error: $UNRELEASED_YAML not found — nothing to lock.${NC}" >&2
  exit 1
fi

# --- Step 1: Rename QA YAML ---

if [[ -f "$VERSIONED_YAML" ]]; then
  echo -e "${YELLOW}Step 1: ${VERSIONED_YAML} already exists — skipped.${NC}"
else
  git -C "$REPO_ROOT" mv "$UNRELEASED_YAML" "$VERSIONED_YAML"
  echo -e "${GREEN}Step 1: Renamed qa-test-cases-unreleased.yaml → qa-test-cases-v${VERSION}.yaml${NC}"
fi

# --- Step 2: Bump .version ---

CURRENT_VERSION=$(jq -r '.version // empty' "$PACKAGE_JSON")
if [[ "$CURRENT_VERSION" == "$VERSION" ]]; then
  echo -e "${YELLOW}Step 2: .version already ${VERSION} — skipped.${NC}"
else
  jq --arg v "$VERSION" '.version = $v' "$PACKAGE_JSON" > "$PACKAGE_JSON.tmp"
  mv "$PACKAGE_JSON.tmp" "$PACKAGE_JSON"
  echo -e "${GREEN}Step 2: Bumped .version ${CURRENT_VERSION} → ${VERSION}${NC}"
fi

# --- Step 3: Regenerate versioned release testing instructions ---

VERSIONED_INSTRUCTIONS="$QA_DIR/release-testing-instructions-v${VERSION}.md"
UNRELEASED_INSTRUCTIONS="$QA_DIR/release-testing-instructions-unreleased.md"

if [[ -f "$VERSIONED_INSTRUCTIONS" ]]; then
  echo -e "${YELLOW}Step 3: ${VERSIONED_INSTRUCTIONS} already exists — skipped.${NC}"
else
  # Delete unreleased instructions to bypass the script's early-exit.
  rm -f "$UNRELEASED_INSTRUCTIONS"

  "$SCRIPT_DIR/generate-release-testing-instructions.sh"

  if [[ ! -f "$UNRELEASED_INSTRUCTIONS" ]]; then
    echo -e "${RED}Error: generate-release-testing-instructions.sh did not produce expected output.${NC}" >&2
    exit 1
  fi

  mv "$UNRELEASED_INSTRUCTIONS" "$VERSIONED_INSTRUCTIONS"

  # Fixup internal references from unreleased → versioned.
  sed -i.bak \
    -e "s/qa-test-cases-unreleased\.yaml/qa-test-cases-v${VERSION}.yaml/g" \
    -e "s/qa-checklist-unreleased/qa-checklist-v${VERSION}/g" \
    -e "s/ → Unreleased/ → v${VERSION}/g" \
    "$VERSIONED_INSTRUCTIONS" && rm -f "${VERSIONED_INSTRUCTIONS}.bak"

  echo -e "${GREEN}Step 3: Generated release-testing-instructions-v${VERSION}.md${NC}"
fi

echo ""
echo -e "${GREEN}Locked at v${VERSION}. QA can now begin against a concrete version.${NC}"
