#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/orchestrate-release-lock.sh X.Y.Z
#
# Orchestrates the release lock workflow:
#   1. Create a release/vX.Y.Z branch from main
#   2. Run lock-version.sh (bump .version, regenerate instructions)
#   3. Run generate-qa-issue.sh (create GitHub QA issue tracker)
#   4. Inject the QA issue URL into the instructions file frontmatter
#   5. Generate a commit message file
#
# Idempotent: safe to re-run after adding bug-fix TCs. On re-run,
# detects the prior QA issue from the instructions frontmatter, closes it
# with a "Superseded by #NEW" comment, and creates a fresh issue.
#
# Tolerates uncommitted release-testing-instructions-vX.Y.Z.md so the
# supersession logic can read its frontmatter on re-run. Any other dirty
# file still blocks.

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
INSTRUCTIONS_FILE="$PACKAGE_DIR/qa/release-testing-instructions-v${VERSION}.md"

# --- Working tree must be clean (except for the release instructions artifact) ---

source "$SCRIPT_DIR/check-dirty-tree.sh"
check_dirty_tree "$REPO_ROOT"

# --- Create or re-enter release branch ---

RELEASE_BRANCH="release/v${VERSION}"
CURRENT_BRANCH=$(git -C "$REPO_ROOT" branch --show-current)

if git -C "$REPO_ROOT" rev-parse --verify "$RELEASE_BRANCH" >/dev/null 2>&1; then
  if [[ "$CURRENT_BRANCH" != "$RELEASE_BRANCH" ]]; then
    echo -e "${YELLOW}Branch $RELEASE_BRANCH already exists (current: $CURRENT_BRANCH).${NC}"
    echo ""
    echo "  [C] Checkout the branch and re-run (idempotent)"
    echo "  [D] Delete it and start fresh"
    echo "  [A] Abort"
    echo ""
    printf 'Choice: '
    read -r REPLY || true
    case "$REPLY" in
      [dD])
        echo -e "${YELLOW}Deleting $RELEASE_BRANCH...${NC}"
        # Snapshot the prior QA issue before the instructions file is destroyed.
        if [[ -f "$INSTRUCTIONS_FILE" ]]; then
          PRIOR_ISSUE_URL=$(sed -n '/^---$/,/^---$/p' "$INSTRUCTIONS_FILE" | grep 'qa_issue_url:' | sed "s/qa_issue_url: *['\"]*//;s/['\"]$//")
        fi
        git -C "$REPO_ROOT" branch -D "$RELEASE_BRANCH"
        if [[ "$CURRENT_BRANCH" != "main" ]]; then
          printf 'Checkout main and pull --rebase? [Y/n] '
          read -r REPLY2 || true
          if [[ -z "$REPLY2" || "$REPLY2" =~ ^[Yy]$ ]]; then
            git -C "$REPO_ROOT" checkout main
            git -C "$REPO_ROOT" pull --rebase origin main
          fi
        fi
        git -C "$REPO_ROOT" checkout -b "$RELEASE_BRANCH" main
        echo -e "${GREEN}Created branch $RELEASE_BRANCH from main${NC}"
        ;;
      [aA])
        echo "Aborted." >&2
        exit 0
        ;;
      *)
        echo -e "${YELLOW}Checking out $RELEASE_BRANCH...${NC}"
        git -C "$REPO_ROOT" checkout "$RELEASE_BRANCH"
        printf 'Pull --rebase from main? [Y/n] '
        read -r REPLY2
        if [[ -z "$REPLY2" || "$REPLY2" =~ ^[Yy]$ ]]; then
          git -C "$REPO_ROOT" pull --rebase origin main
        fi
        ;;
    esac
  else
    echo -e "${YELLOW}Re-running on existing branch $RELEASE_BRANCH.${NC}"
  fi
else
  if [[ "$CURRENT_BRANCH" != "main" ]]; then
    echo -e "${YELLOW}Not on main (current: $CURRENT_BRANCH). Creating $RELEASE_BRANCH from main.${NC}"
  fi
  git -C "$REPO_ROOT" checkout -b "$RELEASE_BRANCH" main
  echo -e "${GREEN}Created branch $RELEASE_BRANCH from main${NC}"
fi

# --- Detect existing remote branch for push strategy ---

PUSH_FLAGS="-u"
if git -C "$REPO_ROOT" ls-remote --heads origin "$RELEASE_BRANCH" 2>/dev/null | grep -q "$RELEASE_BRANCH"; then
  PUSH_FLAGS="-u --force-with-lease"
  echo -e "${YELLOW}Remote branch origin/$RELEASE_BRANCH exists; push will use --force-with-lease.${NC}"
fi

# --- Step 1: Lock the version ---

"$SCRIPT_DIR/lock-version.sh" "$VERSION"
echo ""

# --- Step 2: Detect prior QA issue (idempotency re-run) ---

# Only discover from the current instructions file if the "d"elete path
# didn't already snapshot it before destroying the old branch.
if [[ -z "${PRIOR_ISSUE_URL:-}" ]] && [[ -f "$INSTRUCTIONS_FILE" ]]; then
  PRIOR_ISSUE_URL=$(sed -n '/^---$/,/^---$/p' "$INSTRUCTIONS_FILE" | grep 'qa_issue_url:' | sed "s/qa_issue_url: *['\"]*//;s/['\"]$//")
fi

# --- Step 3: Generate QA issue ---

echo -e "${GREEN}Step 3: Generating QA issue tracker...${NC}"

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

# --- Step 4: Supersede prior issue and update instructions ---

if [[ -n "$PRIOR_ISSUE_URL" ]]; then
  echo -e "${YELLOW}Prior QA issue found: $PRIOR_ISSUE_URL${NC}"
  gh issue comment "$PRIOR_ISSUE_URL" --body "Superseded by $QA_ISSUE_URL (release:lock re-run)."
  gh issue close "$PRIOR_ISSUE_URL"
  gh issue comment "$QA_ISSUE_URL" --body "Supersedes $PRIOR_ISSUE_URL."
  echo -e "${GREEN}Closed prior issue; new issue has backref.${NC}"
fi

# Inject the QA issue URL into the instructions file.
sed -i.bak \
  -e "s|qa_issue_url: ['\"].*['\"]|qa_issue_url: '$QA_ISSUE_URL'|" \
  -e "s|\*\*QA tracker:\*\* .*|\*\*QA tracker:\*\* $QA_ISSUE_URL|" \
  "$INSTRUCTIONS_FILE" && rm -f "${INSTRUCTIONS_FILE}.bak"

echo -e "${GREEN}QA issue URL injected into instructions file.${NC}"

# --- Step 5: Validate QA coverage ---

echo -e "${GREEN}Step 5: Validating QA coverage...${NC}"

if "$SCRIPT_DIR/validate-qa-coverage.sh" > /dev/null 2>&1; then
  echo -e "${GREEN}QA coverage validation passed.${NC}"
else
  echo -e "${RED}QA coverage validation failed. Fix mismatches and re-run.${NC}" >&2
  exit 1
fi

# --- Step 6: Generate commit message ---

COMMIT_MSGS_DIR="$REPO_ROOT/.commit-msgs"
mkdir -p "$COMMIT_MSGS_DIR"

LAST=$(ls "$COMMIT_MSGS_DIR" | grep -o '^[0-9]\{4\}' | sort -n | tail -1 || true)
NEXT_NUM=$(printf "%04d" $((10#${LAST:-0} + 1)))
COMMIT_MSG_FILE="$COMMIT_MSGS_DIR/${NEXT_NUM}-lock-version-v${VERSION}.txt"

cat > "$COMMIT_MSG_FILE" <<EOF
[release] Lock version v${VERSION}

Soft-lock the deferred "Unreleased" version for QA.

- Bumped package.json .version → ${VERSION}
- Regenerated release testing instructions
- Generated QA issue tracker: ${QA_ISSUE_URL}

EOF

echo -e "${GREEN}Commit message: $(basename "$COMMIT_MSG_FILE")${NC}"

# Post the workflow instructions as a comment on the QA issue so they are
# visible alongside the checkboxes — no need to switch between the issue
# and the instructions file. The commit message path is now known, so the
# comment includes the exact copy-paste commands.
COMMIT_MSG_REL="${COMMIT_MSG_FILE#"$REPO_ROOT"/}"
gh issue comment "$QA_ISSUE_URL" --body "## Workflow

- [ ] Commit:
  \`\`\`
  git add -u && git add ${INSTRUCTIONS_FILE#"$REPO_ROOT"/} && git commit -F $COMMIT_MSG_REL
  \`\`\`
- [ ] Push:
  \`\`\`
  git push $PUSH_FLAGS origin $RELEASE_BRANCH
  \`\`\`
- [ ] Create PR:
  \`\`\`
  gh pr create --title \"[release] Lock version v${VERSION}\" --body-file $COMMIT_MSG_REL
  \`\`\`
- [ ] Work through the checkboxes above — each row has the exact pnpm command
- [ ] When all checkboxes pass: \`pnpm release:prepare:vscode-extension\`"

# --- Summary ---

echo ""
echo -e "${GREEN}Release v${VERSION} locked on branch $RELEASE_BRANCH.${NC}"
echo ""
echo "Next steps:"
echo "  1. Review the changes: git diff"
echo "  2. Commit: git add -u && git add ${INSTRUCTIONS_FILE#"$REPO_ROOT"/} && git commit -F $COMMIT_MSG_FILE"
echo "  3. Push and create PR: git push $PUSH_FLAGS origin $RELEASE_BRANCH"
echo "  4. Work through the QA issue tracker: ${QA_ISSUE_URL}"
echo "  5. When QA is clean: pnpm release:prepare:vscode-extension"
