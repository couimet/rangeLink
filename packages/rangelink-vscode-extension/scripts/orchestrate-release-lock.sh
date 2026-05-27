#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/orchestrate-release-lock.sh X.Y.Z
#
# Orchestrates the release lock workflow:
#   1. Create a release/vX.Y.Z branch from main
#   2. Run lock-version.sh (rename YAML, bump .version, regenerate instructions)
#   3. Run generate-qa-issue.sh (create GitHub QA issue tracker)
#   4. Generate a commit message file
#
# Delegates the actual work to the individual scripts; this script handles
# branch setup and sequencing only.

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

# --- Working tree must be clean ---

if [[ -n "$(git -C "$REPO_ROOT" status --porcelain)" ]]; then
  echo -e "${RED}Error: working tree is dirty. Commit or stash changes first.${NC}" >&2
  exit 1
fi

# --- Create release branch ---

RELEASE_BRANCH="release/v${VERSION}"
if git -C "$REPO_ROOT" rev-parse --verify "$RELEASE_BRANCH" >/dev/null 2>&1; then
  echo -e "${RED}Error: branch $RELEASE_BRANCH already exists.${NC}" >&2
  exit 1
fi

CURRENT_BRANCH=$(git -C "$REPO_ROOT" branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo -e "${YELLOW}Not on main (current: $CURRENT_BRANCH). Creating $RELEASE_BRANCH from main.${NC}"
fi

git -C "$REPO_ROOT" checkout -b "$RELEASE_BRANCH" main
echo -e "${GREEN}Created branch $RELEASE_BRANCH from main${NC}"

# --- Step 1: Lock the version ---

"$SCRIPT_DIR/lock-version.sh" "$VERSION"
echo ""

# --- Step 2: Generate QA issue ---

QA_OUTPUT=$("$SCRIPT_DIR/generate-qa-issue.sh") || {
  echo -e "${RED}Error: generate-qa-issue.sh failed${NC}" >&2
  exit 1
}
echo "$QA_OUTPUT"
echo ""

QA_ISSUE_URL=$(echo "$QA_OUTPUT" | grep -o 'https://github\.com/[^ ]*issues/[0-9]*')
if [[ -z "$QA_ISSUE_URL" ]]; then
  echo -e "${RED}Error: could not extract QA issue URL from generate-qa-issue.sh output${NC}" >&2
  exit 1
fi

# --- Step 3: Generate commit message ---

COMMIT_MSGS_DIR="$REPO_ROOT/.commit-msgs"
mkdir -p "$COMMIT_MSGS_DIR"

LAST=$(ls "$COMMIT_MSGS_DIR" | grep -o '^[0-9]\{4\}' | sort -n | tail -1 || true)
NEXT_NUM=$(printf "%04d" $((10#${LAST:-0} + 1)))
COMMIT_MSG_FILE="$COMMIT_MSGS_DIR/${NEXT_NUM}-lock-version-v${VERSION}.txt"

cat > "$COMMIT_MSG_FILE" <<EOF
[release] Lock version v${VERSION}

Soft-lock the deferred "Unreleased" version for QA.

- Renamed qa-test-cases-unreleased.yaml → qa-test-cases-v${VERSION}.yaml
- Bumped package.json .version → ${VERSION}
- Regenerated release testing instructions
- Generated QA issue tracker: ${QA_ISSUE_URL}

EOF

echo -e "${GREEN}Commit message: $(basename "$COMMIT_MSG_FILE")${NC}"

# --- Summary ---

echo ""
echo -e "${GREEN}Release v${VERSION} locked on branch $RELEASE_BRANCH.${NC}"
echo ""
echo "Next steps:"
echo "  1. Review the changes: git diff"
echo "  2. Commit: git add -u && git commit -F $COMMIT_MSG_FILE"
echo "  3. Push and create PR: git push -u origin $RELEASE_BRANCH"
echo "  4. Work through the QA issue tracker: ${QA_ISSUE_URL}"
echo "  5. When QA is clean: pnpm release:prepare:vscode-extension"
