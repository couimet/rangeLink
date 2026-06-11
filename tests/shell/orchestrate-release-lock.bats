#!/usr/bin/env bats

load test_helper

REAL_SCRIPT="$PROJECT_ROOT/packages/rangelink-vscode-extension/scripts/orchestrate-release-lock.sh"

setup_fixture() {
  FIXTURE_ROOT="$TEST_TEMP_DIR"
  mkdir -p "$FIXTURE_ROOT/scripts"
  mkdir -p "$FIXTURE_ROOT/qa"
  mkdir -p "$FIXTURE_ROOT/.commit-msgs"

  cp "$REAL_SCRIPT" "$FIXTURE_ROOT/scripts/orchestrate-release-lock.sh"
  SCRIPT="$FIXTURE_ROOT/scripts/orchestrate-release-lock.sh"

  # Default: branch does not exist, we are on main, working tree clean.
  export GIT_BRANCH_EXISTS=1    # 0 = exists, 1 = does not exist
  export GIT_CURRENT_BRANCH="main"
  export GIT_STATUS_DIRTY=0     # 0 = clean, 1 = dirty

  stub_dir
  make_stub "git" <<'ENDOFSTUB'
case "$*" in
  *--show-toplevel*) echo "$FIXTURE_ROOT_FOR_GIT" ;;
  *"status"*) [[ "$GIT_STATUS_DIRTY" -eq 1 ]] && echo "?? dirty" ; exit 0 ;;
  *"checkout -b"*) exit 0 ;;
  *"rev-parse --verify"*) exit "$GIT_BRANCH_EXISTS" ;;
  *"branch --show-current"*) echo "$GIT_CURRENT_BRANCH" ;;
  *) exit 0 ;;
esac
ENDOFSTUB
  export FIXTURE_ROOT_FOR_GIT="$FIXTURE_ROOT"

  make_passive_stub "gh"

  # Stub lock-version.sh (idempotent: does not clobber existing instructions).
  cat > "$FIXTURE_ROOT/scripts/lock-version.sh" <<'STUBEOF'
#!/usr/bin/env bash
echo "Locked version $1"
INSTRUCTIONS_FILE="$(dirname "$(dirname "${BASH_SOURCE[0]}")")/qa/release-testing-instructions-v${1}.md"
if [[ ! -f "$INSTRUCTIONS_FILE" ]]; then
  mkdir -p "$(dirname "$INSTRUCTIONS_FILE")"
  cat > "$INSTRUCTIONS_FILE" <<'INSTEOF'
---
version: PLACEHOLDER
qa_issue_url: ""
generated: 2026-01-01T00:00:00Z
---

# Release Testing: Placeholder

**Scope:** Changes from v1.0.0 → vPLACEHOLDER
**QA tracker:** <to be filled by release:lock>
INSTEOF
fi
STUBEOF
  chmod +x "$FIXTURE_ROOT/scripts/lock-version.sh"

  # Stub generate-qa-issue.sh.
  cat > "$FIXTURE_ROOT/scripts/generate-qa-issue.sh" <<'STUBEOF'
#!/usr/bin/env bash
echo "Created QA issue: https://github.com/couimet/rangeLink/issues/999"
STUBEOF
  chmod +x "$FIXTURE_ROOT/scripts/generate-qa-issue.sh"
}

# ── First run (fresh branch) ───────────────────────────────────────────────────────

@test "first run: creates branch, locks version, generates QA issue" {
  setup_fixture
  export GIT_BRANCH_EXISTS=1  # branch does not exist

  run "$SCRIPT" "1.0.0"
  [[ "$status" -eq 0 ]]
  [[ "$output" =~ "Created branch release/v1.0.0 from main" ]]
  [[ "$output" =~ "Locked version 1.0.0" ]]
  [[ "$output" =~ "Created QA issue" ]]
  [[ -f "$FIXTURE_ROOT/.commit-msgs/0001-lock-version-v1.0.0.txt" ]]
}

@test "first run: sed injects QA issue URL into instructions frontmatter" {
  setup_fixture
  export GIT_BRANCH_EXISTS=1

  run "$SCRIPT" "1.0.0"
  [[ "$status" -eq 0 ]]

  local ins="$FIXTURE_ROOT/qa/release-testing-instructions-v1.0.0.md"
  [[ -f "$ins" ]]
  grep -q 'qa_issue_url: "https://github.com/couimet/rangeLink/issues/999"' "$ins"
  grep -q '\*\*QA tracker:\*\* https://github.com/couimet/rangeLink/issues/999' "$ins"
}

# ── Re-run (branch exists, already on it) ──────────────────────────────────────────

@test "re-run: continues on existing branch instead of erroring" {
  setup_fixture
  export GIT_BRANCH_EXISTS=0       # branch already exists
  export GIT_CURRENT_BRANCH="release/v1.0.0"

  run "$SCRIPT" "1.0.0"
  [[ "$status" -eq 0 ]]
  [[ "$output" =~ "Re-running on existing branch release/v1.0.0" ]]
  [[ "$output" =~ "Locked version 1.0.0" ]]
  [[ "$output" =~ "Created QA issue" ]]
}

@test "re-run: supersession closes prior issue" {
  setup_fixture
  export GIT_BRANCH_EXISTS=0
  export GIT_CURRENT_BRANCH="release/v1.0.0"

  # Write an instructions file with a prior qa_issue_url to simulate first run.
  local ins="$FIXTURE_ROOT/qa/release-testing-instructions-v1.0.0.md"
  mkdir -p "$(dirname "$ins")"
  cat > "$ins" <<'INSTEOF'
---
version: 1.0.0
qa_issue_url: "https://github.com/couimet/rangeLink/issues/888"
generated: 2026-01-01T00:00:00Z
---

# Release Testing: Placeholder

**Scope:** Changes from v1.0.0 → v1.0.0
**QA tracker:** https://github.com/couimet/rangeLink/issues/888
INSTEOF

  run "$SCRIPT" "1.0.0"
  [[ "$status" -eq 0 ]]
  [[ "$output" =~ "Prior QA issue found" ]]
  [[ "$output" =~ "Closed prior issue" ]]
}

@test "re-run: sed replaces existing qa_issue_url (not just empty placeholder)" {
  setup_fixture
  export GIT_BRANCH_EXISTS=0
  export GIT_CURRENT_BRANCH="release/v1.0.0"

  # Write instructions with a prior issue URL.
  local ins="$FIXTURE_ROOT/qa/release-testing-instructions-v1.0.0.md"
  mkdir -p "$(dirname "$ins")"
  cat > "$ins" <<'INSTEOF'
---
version: 1.0.0
qa_issue_url: "https://github.com/couimet/rangeLink/issues/888"
generated: 2026-01-01T00:00:00Z
---

# Release Testing: Placeholder

**Scope:** Changes from v1.0.0 → v1.0.0
**QA tracker:** https://github.com/couimet/rangeLink/issues/888
INSTEOF

  run "$SCRIPT" "1.0.0"
  [[ "$status" -eq 0 ]]

  # Old URL should be replaced with new URL.
  grep -q 'qa_issue_url: "https://github.com/couimet/rangeLink/issues/999"' "$ins"
  grep -q '\*\*QA tracker:\*\* https://github.com/couimet/rangeLink/issues/999' "$ins"
  ! grep -q 'issues/888' "$ins"
}

# ── Error: branch exists on different checkout ─────────────────────────────────────

@test "re-run: exits 1 when branch exists but we are on different branch" {
  setup_fixture
  export GIT_BRANCH_EXISTS=0
  export GIT_CURRENT_BRANCH="some-other-branch"

  run "$SCRIPT" "1.0.0"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "already exists but current branch is" ]]
}

# ── Commit message numbering ──────────────────────────────────────────────────────

@test "picks next number after existing files" {
  setup_fixture
  export GIT_BRANCH_EXISTS=1
  touch "$FIXTURE_ROOT/.commit-msgs/0001-old.txt"
  touch "$FIXTURE_ROOT/.commit-msgs/0005-old.txt"
  touch "$FIXTURE_ROOT/.commit-msgs/0010-old.txt"

  run "$SCRIPT" "2.0.0"
  [[ "$status" -eq 0 ]]
  [[ -f "$FIXTURE_ROOT/.commit-msgs/0011-lock-version-v2.0.0.txt" ]]
}
