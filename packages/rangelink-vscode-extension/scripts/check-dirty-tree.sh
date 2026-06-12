#!/usr/bin/env bash
#
# Shared helper sourced by the release scripts. Exit 1 if the working tree has
# uncommitted changes, except for the release instructions artifact
# (release-testing-instructions-vX.Y.Z.md) which the supersession logic
# needs to read on re-run.
#
# Usage:
#   source "$SCRIPT_DIR/check-dirty-tree.sh"
#   check_dirty_tree "$REPO_ROOT"

check_dirty_tree() {
  local repo_root="$1"
  local artifact_glob='packages/rangelink-vscode-extension/qa/release-testing-instructions-v*.md'
  local dirty
  dirty=$(git -C "$repo_root" status --porcelain -- ":(exclude)$artifact_glob")
  if [[ -n "$dirty" ]]; then
    echo -e "${RED:-}Error: working tree is dirty. Commit or stash changes first.${NC:-}" >&2
    echo "$dirty" >&2
    exit 1
  fi
  # Surface the relaxation so it is visible in the log.
  if [[ -n "$(git -C "$repo_root" status --porcelain -- "$artifact_glob")" ]]; then
    echo -e "${YELLOW:-}Note: tolerating uncommitted release-testing-instructions-v*.md (release artifact).${NC:-}"
  fi
}
