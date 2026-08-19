#!/usr/bin/env bats

load test_helper

REAL_SCRIPT="$PROJECT_ROOT/packages/rangelink-vscode-extension/scripts/orchestrate-release-lock.sh"

setup_fixture() {
  FIXTURE_ROOT="$TEST_TEMP_DIR"
  mkdir -p "$FIXTURE_ROOT/scripts"
  mkdir -p "$FIXTURE_ROOT/qa"
  mkdir -p "$FIXTURE_ROOT/.commit-msgs"

  cp "$REAL_SCRIPT" "$FIXTURE_ROOT/scripts/orchestrate-release-lock.sh"
  cp "$PROJECT_ROOT/packages/rangelink-vscode-extension/scripts/check-dirty-tree.sh" \
     "$FIXTURE_ROOT/scripts/check-dirty-tree.sh"
  cp "$PROJECT_ROOT/packages/rangelink-vscode-extension/scripts/release-board-lib.sh" \
     "$FIXTURE_ROOT/scripts/release-board-lib.sh"
  SCRIPT="$FIXTURE_ROOT/scripts/orchestrate-release-lock.sh"

  # Default: branch does not exist, we are on main, working tree clean.
  export GIT_BRANCH_EXISTS=1    # 0 = exists, 1 = does not exist
  export GIT_CURRENT_BRANCH="main"
  export GIT_STATUS_DIRTY=0     # 0=clean, 1=arbitrary dirty, 2=artifact-only
  export GIT_REMOTE_BRANCH_EXISTS=0  # 0=no, 1=yes

  stub_dir
  make_stub "git" <<'ENDOFSTUB'
#!/usr/bin/env bash
echo "git $*" >> "$GIT_CALL_LOG"
case "$*" in
  *--show-toplevel*) echo "$FIXTURE_ROOT_FOR_GIT" ;;
  *"status"*)
    # GIT_STATUS_DIRTY: 0=clean, 1=arbitrary dirty file, 2=only release artifact dirty.
    case "${GIT_STATUS_DIRTY:-0}" in
      1) echo "?? dirty.txt" ;;
      2)
        if [[ "$*" == *"(exclude)"*"release-testing-instructions-v"* ]]; then
          :  # excluded — no output
        else
          echo "?? packages/rangelink-vscode-extension/qa/release-testing-instructions-v2.0.0.md"
        fi
        ;;
    esac
    exit 0 ;;
  *"checkout -b"*) exit 0 ;;
  *"branch -D"*) exit 0 ;;
  *"checkout"*) echo "Switched to branch" ;;
  *"pull --rebase"*) exit 0 ;;
  *"ls-remote"*) [[ "$GIT_REMOTE_BRANCH_EXISTS" -eq 1 ]] && echo "refs/heads/release/v1.0.0" ; exit 0 ;;
  *"rev-parse --verify"*) exit "$GIT_BRANCH_EXISTS" ;;
  *"branch --show-current"*) echo "$GIT_CURRENT_BRANCH" ;;
  *) exit 0 ;;
esac
ENDOFSTUB
  export FIXTURE_ROOT_FOR_GIT="$FIXTURE_ROOT"
  export GIT_CALL_LOG="$FIXTURE_ROOT/git-calls.log"
  : > "$GIT_CALL_LOG"

  # gh stub that logs each call so tests can assert on the workflow comment body.
  # Set EXISTING_PR_URL to make `gh pr list --head` return a PR URL.
  # Board-cleanup calls (`gh api graphql --input <file>`, `gh issue view`) only
  # happen on re-runs that supersede a prior issue; they dispatch on the payload
  # content against the PROJECTS_RESPONSE_FILE / ITEMS_RESPONSE_FILE fixtures.
  make_stub "gh" <<'ENDOFSTUB'
#!/usr/bin/env bash
echo "gh $*" >> "$GH_CALL_LOG"
case "$*" in
  *"pr list --head"*)
    if [[ -n "${EXISTING_PR_URL:-}" ]]; then
      echo "${EXISTING_PR_URL}"
    fi
    ;;
  *"api graphql --input"*)
    PAYLOAD="${@: -1}"
    echo "graphql --input $PAYLOAD" >> "$GH_CALL_LOG"
    cat "$PAYLOAD" >> "$GH_CALL_LOG"
    echo "" >> "$GH_CALL_LOG"
    if grep -q 'updateProjectV2ItemFieldValue' "$PAYLOAD"; then
      echo '{"data": {"updateProjectV2ItemFieldValue": {"projectV2Item": {"id": "PVTI_X"}}}}'
    elif grep -q 'deleteProjectV2Item' "$PAYLOAD"; then
      echo '{"data": {"deleteProjectV2Item": {"deletedItemId": "PVTI_X"}}}'
    elif grep -q 'items(first' "$PAYLOAD"; then
      cat "$ITEMS_RESPONSE_FILE"
    elif grep -q 'projectsV2' "$PAYLOAD"; then
      cat "$PROJECTS_RESPONSE_FILE"
    fi
    ;;
  *"issue view"*)
    echo "issue view ${*}" >> "$GH_CALL_LOG"
    # Derive the node id from the issue number: issues/888 → I_kw_888.
    NUMBER=$(echo "$*" | grep -o 'issues/[0-9]*' | head -1 | sed 's|issues/||')
    echo "I_kw_${NUMBER}"
    ;;
esac
exit 0
ENDOFSTUB
  export GH_CALL_LOG="$FIXTURE_ROOT/gh-calls.log"
  : > "$GH_CALL_LOG"

  # Board-cleanup fixtures for the re-run supersession tests. Default projects
  # fixture lists the release board (with a Status/Done option); default items
  # fixture has the prior issues' board items.
  export PROJECTS_RESPONSE_FILE="$FIXTURE_ROOT/projects-response.json"
  export ITEMS_RESPONSE_FILE="$FIXTURE_ROOT/items-response.json"
  cat > "$PROJECTS_RESPONSE_FILE" <<'EOF'
{"data": {"viewer": {"projectsV2": {"nodes": [
  {
    "id": "PVT_BOARD",
    "number": 7,
    "title": "RangeLink v1.0.0 release",
    "url": "https://github.com/users/couimet/projects/7",
    "fields": {"nodes": [
      {
        "id": "FIELD_STATUS",
        "name": "Status",
        "options": [
          {"id": "OPT_DONE", "name": "Done"},
          {"id": "OPT_READY", "name": "Ready"}
        ]
      }
    ]}
  }
]}}}}
EOF
  cat > "$ITEMS_RESPONSE_FILE" <<'EOF'
{"data": {"node": {"items": {"pageInfo": {"hasNextPage": false, "endCursor": null}, "nodes": [
  {"id": "PVTI_PRIOR", "content": {"__typename": "Issue", "id": "I_kw_888"}},
  {"id": "PVTI_DEVTO", "content": {"__typename": "Issue", "id": "I_kw_777"}}
]}}}}
EOF

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
qa_issue_url: ''
devto_issue_url: ''
generated: 2026-01-01T00:00:00Z
---

# Release Testing: Placeholder

**Scope:** Changes from v1.0.0 → vPLACEHOLDER
**QA tracker:** <to be filled by release:lock>
**Dev.to post:** <to be filled by release:lock>
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

  # Stub generate-release-issues.sh (logs its args so tests can assert the QA URL was passed).
  cat > "$FIXTURE_ROOT/scripts/generate-release-issues.sh" <<'STUBEOF'
#!/usr/bin/env bash
echo "generate-release-issues.sh $*" >> "$GEN_ISSUES_CALL_LOG"
echo "Created dev.to issue: https://github.com/couimet/rangeLink/issues/1000"
STUBEOF
  chmod +x "$FIXTURE_ROOT/scripts/generate-release-issues.sh"
  export GEN_ISSUES_CALL_LOG="$FIXTURE_ROOT/generate-issues-calls.log"
  : > "$GEN_ISSUES_CALL_LOG"

  # Stub validate-qa-coverage.sh (exits with QA_VALIDATE_EXIT).
  cat > "$FIXTURE_ROOT/scripts/validate-qa-coverage.sh" <<'STUBEOF'
#!/usr/bin/env bash
exit "${QA_VALIDATE_EXIT:-0}"
STUBEOF
  chmod +x "$FIXTURE_ROOT/scripts/validate-qa-coverage.sh"
  export QA_VALIDATE_EXIT=0
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

@test "first run: sed injects QA and dev.to issue URLs into instructions frontmatter" {
  setup_fixture
  export GIT_BRANCH_EXISTS=1

  run "$SCRIPT" "1.0.0"
  [[ "$status" -eq 0 ]]

  local ins="$FIXTURE_ROOT/qa/release-testing-instructions-v1.0.0.md"
  [[ -f "$ins" ]]
  grep -q "qa_issue_url: 'https://github.com/couimet/rangeLink/issues/999'" "$ins"
  grep -q '\*\*QA tracker:\*\* https://github.com/couimet/rangeLink/issues/999' "$ins"
  grep -q "devto_issue_url: 'https://github.com/couimet/rangeLink/issues/1000'" "$ins"
  grep -q '\*\*Dev.to post:\*\* https://github.com/couimet/rangeLink/issues/1000' "$ins"
}

@test "first run: generate-release-issues.sh receives the QA issue URL" {
  setup_fixture
  export GIT_BRANCH_EXISTS=1

  run "$SCRIPT" "1.0.0"
  [[ "$status" -eq 0 ]]

  grep -q 'https://github.com/couimet/rangeLink/issues/999' "$GEN_ISSUES_CALL_LOG"
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
qa_issue_url: 'https://github.com/couimet/rangeLink/issues/888'
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

  # Prior issue's board item marked Done before the issue is closed.
  [[ "$output" =~ "Marked superseded board item Done" ]]
  grep -q 'updateProjectV2ItemFieldValue' "$GH_CALL_LOG"
  grep -q 'OPT_DONE' "$GH_CALL_LOG"
}

@test "re-run: dev.to supersession closes prior dev.to issue" {
  setup_fixture
  export GIT_BRANCH_EXISTS=0
  export GIT_CURRENT_BRANCH="release/v1.0.0"

  # Write instructions with a prior devto_issue_url to simulate first run.
  local ins="$FIXTURE_ROOT/qa/release-testing-instructions-v1.0.0.md"
  mkdir -p "$(dirname "$ins")"
  cat > "$ins" <<'INSTEOF'
---
version: 1.0.0
qa_issue_url: 'https://github.com/couimet/rangeLink/issues/888'
devto_issue_url: 'https://github.com/couimet/rangeLink/issues/777'
generated: 2026-01-01T00:00:00Z
---

# Release Testing: Placeholder

**Scope:** Changes from v1.0.0 → v1.0.0
**QA tracker:** https://github.com/couimet/rangeLink/issues/888
**Dev.to post:** https://github.com/couimet/rangeLink/issues/777
INSTEOF

  run "$SCRIPT" "1.0.0"
  [[ "$status" -eq 0 ]]
  [[ "$output" =~ "Prior dev.to issue found" ]]
  [[ "$output" =~ "Closed prior dev.to issue" ]]

  # Prior issue closed with supersession comment, new issue gets the backref.
  grep -q 'issue close https://github.com/couimet/rangeLink/issues/777' "$GH_CALL_LOG"
  grep -q 'Superseded by https://github.com/couimet/rangeLink/issues/1000 (release:lock re-run).' "$GH_CALL_LOG"
  grep -q 'Supersedes https://github.com/couimet/rangeLink/issues/777.' "$GH_CALL_LOG"

  # Both prior issues' board items marked Done.
  grep -q 'updateProjectV2ItemFieldValue' "$GH_CALL_LOG"
  grep -q 'OPT_DONE' "$GH_CALL_LOG"

  # Old URL replaced with new URL in the instructions file.
  grep -q "devto_issue_url: 'https://github.com/couimet/rangeLink/issues/1000'" "$ins"
  ! grep -q 'issues/777' "$ins"
}

@test "re-run: board cleanup removes the item when the board has no Done option" {
  setup_fixture
  export GIT_BRANCH_EXISTS=0
  export GIT_CURRENT_BRANCH="release/v1.0.0"

  # Projects fixture with Status options but no Done → delete path.
  cat > "$PROJECTS_RESPONSE_FILE" <<'EOF'
{"data": {"viewer": {"projectsV2": {"nodes": [
  {
    "id": "PVT_BOARD",
    "number": 7,
    "title": "RangeLink v1.0.0 release",
    "url": "https://github.com/users/couimet/projects/7",
    "fields": {"nodes": [
      {
        "id": "FIELD_STATUS",
        "name": "Status",
        "options": [{"id": "OPT_READY", "name": "Ready"}]
      }
    ]}
  }
]}}}}
EOF

  # Same instructions as the dev.to supersession test.
  local ins="$FIXTURE_ROOT/qa/release-testing-instructions-v1.0.0.md"
  mkdir -p "$(dirname "$ins")"
  cat > "$ins" <<'INSTEOF'
---
version: 1.0.0
qa_issue_url: 'https://github.com/couimet/rangeLink/issues/888'
devto_issue_url: 'https://github.com/couimet/rangeLink/issues/777'
generated: 2026-01-01T00:00:00Z
---

# Release Testing: Placeholder

**Scope:** Changes from v1.0.0 → v1.0.0
**QA tracker:** https://github.com/couimet/rangeLink/issues/888
**Dev.to post:** https://github.com/couimet/rangeLink/issues/777
INSTEOF

  run "$SCRIPT" "1.0.0"
  [[ "$status" -eq 0 ]]
  [[ "$output" =~ "Removed superseded board item" ]]

  # Item deleted, never updated to Done.
  grep -q 'deleteProjectV2Item' "$GH_CALL_LOG"
  ! grep -q 'updateProjectV2ItemFieldValue' "$GH_CALL_LOG"
}

@test "re-run: board cleanup warns and continues when the board is missing" {
  setup_fixture
  export GIT_BRANCH_EXISTS=0
  export GIT_CURRENT_BRANCH="release/v1.0.0"

  # Projects fixture with no board matching "RangeLink v1.0.0 release".
  cat > "$PROJECTS_RESPONSE_FILE" <<'EOF'
{"data": {"viewer": {"projectsV2": {"nodes": [
  {"id": "PVT_OTHER", "number": 3, "title": "Backlog board", "fields": {"nodes": []}}
]}}}}
EOF

  local ins="$FIXTURE_ROOT/qa/release-testing-instructions-v1.0.0.md"
  mkdir -p "$(dirname "$ins")"
  cat > "$ins" <<'INSTEOF'
---
version: 1.0.0
qa_issue_url: 'https://github.com/couimet/rangeLink/issues/888'
generated: 2026-01-01T00:00:00Z
---

# Release Testing: Placeholder

**Scope:** Changes from v1.0.0 → v1.0.0
**QA tracker:** https://github.com/couimet/rangeLink/issues/888
INSTEOF

  run "$SCRIPT" "1.0.0"
  [[ "$status" -eq 0 ]]
  [[ "$output" =~ "no project board titled 'RangeLink v1.0.0 release'" ]]

  # Best-effort: the prior issue is still closed despite the missing board.
  grep -q 'issue close https://github.com/couimet/rangeLink/issues/888' "$GH_CALL_LOG"
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
qa_issue_url: 'https://github.com/couimet/rangeLink/issues/888'
generated: 2026-01-01T00:00:00Z
---

# Release Testing: Placeholder

**Scope:** Changes from v1.0.0 → v1.0.0
**QA tracker:** https://github.com/couimet/rangeLink/issues/888
INSTEOF

  run "$SCRIPT" "1.0.0"
  [[ "$status" -eq 0 ]]

  # Old URL should be replaced with new URL.
  grep -q "qa_issue_url: 'https://github.com/couimet/rangeLink/issues/999'" "$ins"
  grep -q '\*\*QA tracker:\*\* https://github.com/couimet/rangeLink/issues/999' "$ins"
  ! grep -q 'issues/888' "$ins"
}

# ── Error: branch exists on different checkout ─────────────────────────────────────

@test "re-run: prompts when branch exists on different checkout — checkout option" {
  setup_fixture
  export GIT_BRANCH_EXISTS=0
  export GIT_CURRENT_BRANCH="some-other-branch"

  # Pipe 'c' (checkout) + 'n' (no pull).
  run bash -c 'echo -e "c\nn" | '"$SCRIPT"' 1.0.0'
  [[ "$status" -eq 0 ]]
  [[ "$output" =~ "Branch release/v1.0.0 already exists" ]]
  grep -q 'checkout release/v1.0.0' "$GIT_CALL_LOG"
  ! grep -q 'pull --rebase' "$GIT_CALL_LOG"
}

@test "re-run: prompts when branch exists — delete and start fresh" {
  setup_fixture
  export GIT_BRANCH_EXISTS=0
  export GIT_CURRENT_BRANCH="some-other-branch"

  # Pipe 'd' (delete) + 'n' (no checkout main).
  run bash -c 'echo -e "d\nn" | '"$SCRIPT"' 1.0.0'
  [[ "$status" -eq 0 ]]
  [[ "$output" =~ "Deleting release/v1.0.0" ]]
  grep -q 'branch -D release/v1.0.0' "$GIT_CALL_LOG"
  grep -q 'checkout -b release/v1.0.0 main' "$GIT_CALL_LOG"
}

@test "re-run: delete path — supersedes prior issue when old instructions had a URL" {
  setup_fixture
  export GIT_BRANCH_EXISTS=0
  export GIT_CURRENT_BRANCH="some-other-branch"

  # Write instructions with a prior qa_issue_url (simulating previous run).
  local ins="$FIXTURE_ROOT/qa/release-testing-instructions-v1.0.0.md"
  mkdir -p "$(dirname "$ins")"
  cat > "$ins" <<'INSTEOF'
---
version: 1.0.0
qa_issue_url: 'https://github.com/couimet/rangeLink/issues/888'
generated: 2026-01-01T00:00:00Z
---

# Release Testing: Placeholder

**Scope:** Changes from v1.0.0 → v1.0.0
**QA tracker:** https://github.com/couimet/rangeLink/issues/888
INSTEOF

  # 'd' (delete) + 'n' (no checkout main).
  run bash -c 'echo -e "d\nn" | '"$SCRIPT"' 1.0.0'
  [[ "$status" -eq 0 ]]
  [[ "$output" =~ "Prior QA issue found" ]]
  [[ "$output" =~ "Closed prior issue" ]]

  # Board cleanup runs even on the branch-delete re-run path.
  [[ "$output" =~ "Marked superseded board item Done" ]]
  grep -q 'updateProjectV2ItemFieldValue' "$GH_CALL_LOG"
}

@test "re-run: prompts when branch exists — abort" {
  setup_fixture
  export GIT_BRANCH_EXISTS=0
  export GIT_CURRENT_BRANCH="some-other-branch"

  # Pipe 'a' to abort.
  run bash -c 'echo a | '"$SCRIPT"' 1.0.0'
  [[ "$status" -eq 0 ]]
  [[ "$output" =~ "Aborted" ]]
}

@test "re-run: checkout path — default yes to pull" {
  setup_fixture
  export GIT_BRANCH_EXISTS=0
  export GIT_CURRENT_BRANCH="some-other-branch"

  # Default 'c' (checkout) then empty (yes) to pull.
  run bash -c 'echo -e "\n" | '"$SCRIPT"' 1.0.0'
  [[ "$status" -eq 0 ]]
  [[ "$output" =~ "Checking out release/v1.0.0" ]]
  grep -q 'checkout release/v1.0.0' "$GIT_CALL_LOG"
  grep -q 'pull --rebase origin main' "$GIT_CALL_LOG"
}

@test "re-run: delete path — default yes to checkout main and pull" {
  setup_fixture
  export GIT_BRANCH_EXISTS=0
  export GIT_CURRENT_BRANCH="some-other-branch"

  # 'd' (delete) then empty (yes) to checkout main + pull.
  run bash -c 'echo -e "d\n" | '"$SCRIPT"' 1.0.0'
  [[ "$status" -eq 0 ]]
  [[ "$output" =~ "Deleting release/v1.0.0" ]]
  [[ "$output" =~ "Created branch release/v1.0.0 from main" ]]
  grep -q 'checkout main' "$GIT_CALL_LOG"
  grep -q 'pull --rebase origin main' "$GIT_CALL_LOG"
  grep -q 'checkout -b release/v1.0.0 main' "$GIT_CALL_LOG"
}

# ── Dirty-tree tolerance for release artifact ─────────────────────────────────────

@test "dirty-tree: clean tree passes" {
  setup_fixture
  export GIT_BRANCH_EXISTS=1
  export GIT_STATUS_DIRTY=0

  run "$SCRIPT" "1.0.0"
  [[ "$status" -eq 0 ]]
  ! [[ "$output" =~ "working tree is dirty" ]]
  ! [[ "$output" =~ "tolerating" ]]
}

@test "dirty-tree: only release artifact dirty passes with notice" {
  setup_fixture
  export GIT_BRANCH_EXISTS=1
  export GIT_STATUS_DIRTY=2

  run "$SCRIPT" "1.0.0"
  [[ "$status" -eq 0 ]]
  [[ "$output" =~ "tolerating uncommitted release-testing-instructions" ]]
}

@test "dirty-tree: other dirty file blocks with exit 1" {
  setup_fixture
  export GIT_BRANCH_EXISTS=1
  export GIT_STATUS_DIRTY=1

  run "$SCRIPT" "1.0.0"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "working tree is dirty" ]]
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

# ── Workflow comment on QA issue ──────────────────────────────────────────────────

@test "posts workflow comment on QA issue after commit message" {
  setup_fixture
  export GIT_BRANCH_EXISTS=1

  run "$SCRIPT" "1.0.0"
  [[ "$status" -eq 0 ]]

  # Verify gh was called with the workflow comment body.
  grep -q '## Workflow' "$GH_CALL_LOG"
}

@test "workflow comment includes commit, push, PR, test, and release steps" {
  setup_fixture
  export GIT_BRANCH_EXISTS=1

  run "$SCRIPT" "1.0.0"
  [[ "$status" -eq 0 ]]

  # The workflow body contains embedded newlines; grep -A captures the full block.
  local body
  body=$(grep -A 20 '## Workflow' "$GH_CALL_LOG")

  # Fenced code blocks (triple backticks) for GitHub copy buttons.
  [[ "$body" =~ '```' ]]
  # Commit step with pre-generated file path.
  [[ "$body" =~ "git add -u && git add qa/release-testing-instructions-v1.0.0.md && git commit -F .commit-msgs/0001-lock-version-v1.0.0.txt" ]]
  # Push step with branch name.
  [[ "$body" =~ "git push -u origin release/v1.0.0" ]]
  # PR creation step.
  [[ "$body" =~ "gh pr create" ]]
  # Release step.
  [[ "$body" =~ "pnpm release:prepare:vscode-extension" ]]
}

@test "workflow comment includes dev.to issue row" {
  setup_fixture
  export GIT_BRANCH_EXISTS=1

  run "$SCRIPT" "1.0.0"
  [[ "$status" -eq 0 ]]

  # The workflow comment body contains the dev.to issue row linking the issue.
  grep -q 'Dev.to issue: https://github.com/couimet/rangeLink/issues/1000' "$GH_CALL_LOG"
}

@test "commit message contains dev.to issue bullet" {
  setup_fixture
  export GIT_BRANCH_EXISTS=1

  run "$SCRIPT" "1.0.0"
  [[ "$status" -eq 0 ]]

  local msg="$FIXTURE_ROOT/.commit-msgs/0001-lock-version-v1.0.0.txt"
  grep -q "Generated dev.to issue: https://github.com/couimet/rangeLink/issues/1000" "$msg"
}

@test "fails when dev.to issue URL is missing from generate-release-issues.sh output" {
  setup_fixture
  export GIT_BRANCH_EXISTS=1

  # Override the stub to produce output without an issue URL.
  cat > "$FIXTURE_ROOT/scripts/generate-release-issues.sh" <<'STUBEOF'
#!/usr/bin/env bash
echo "Board: https://github.com/users/couimet/projects/42"
STUBEOF
  chmod +x "$FIXTURE_ROOT/scripts/generate-release-issues.sh"

  run "$SCRIPT" "1.0.0"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "could not extract dev.to issue URL" ]]
}

@test "workflow comment shows existing PR when PR exists" {
  setup_fixture
  export GIT_BRANCH_EXISTS=1
  export EXISTING_PR_URL="https://github.com/couimet/rangeLink/pull/42"

  run "$SCRIPT" "1.0.0"
  [[ "$status" -eq 0 ]]

  local body
  body=$(grep -A 20 '## Workflow' "$GH_CALL_LOG")
  [[ "$body" =~ "Existing PR: https://github.com/couimet/rangeLink/pull/42" ]]
  ! [[ "$body" =~ "gh pr create" ]]
}

@test "console summary shows existing PR when PR exists" {
  setup_fixture
  export GIT_BRANCH_EXISTS=1
  export EXISTING_PR_URL="https://github.com/couimet/rangeLink/pull/42"

  run "$SCRIPT" "1.0.0"
  [[ "$status" -eq 0 ]]
  [[ "$output" =~ "Existing PR: https://github.com/couimet/rangeLink/pull/42" ]]
  ! [[ "$output" =~ "Create PR:" ]]
}

@test "console summary shows separate push and create-PR steps when no PR exists" {
  setup_fixture
  export GIT_BRANCH_EXISTS=1
  unset EXISTING_PR_URL

  run "$SCRIPT" "1.0.0"
  [[ "$status" -eq 0 ]]
  [[ "$output" =~ "3. Push: git push" ]]
  [[ "$output" =~ "4. Create PR: gh pr create --title \"[release] Lock version v1.0.0\"" ]]
  ! [[ "$output" =~ "Push and create PR" ]]
}

@test "console summary instructs running the release-prep skill for cross-repo tracking" {
  setup_fixture
  export GIT_BRANCH_EXISTS=1

  run "$SCRIPT" "1.0.0"
  [[ "$status" -eq 0 ]]
  [[ "$output" =~ "/release-prep 1.0.0" ]]
  [[ "$output" =~ "couimet.github.io article-registration issue" ]]
}

@test "validate-qa-coverage passes: script continues" {
  setup_fixture
  export GIT_BRANCH_EXISTS=1
  export QA_VALIDATE_EXIT=0

  run "$SCRIPT" "1.0.0"
  [[ "$status" -eq 0 ]]
  [[ "$output" =~ "QA coverage validation passed" ]]
}

@test "validate-qa-coverage fails: script exits 1" {
  setup_fixture
  export GIT_BRANCH_EXISTS=1
  export QA_VALIDATE_EXIT=1

  run "$SCRIPT" "1.0.0"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "QA coverage validation failed" ]]
}

@test "push uses --force-with-lease when remote branch exists" {
  setup_fixture
  export GIT_BRANCH_EXISTS=1
  export GIT_REMOTE_BRANCH_EXISTS=1

  run "$SCRIPT" "1.0.0"
  [[ "$status" -eq 0 ]]
  [[ "$output" =~ "Remote branch origin/release/v1.0.0 exists" ]]

  local body
  body=$(grep -A 20 '## Workflow' "$GH_CALL_LOG")
  [[ "$body" =~ "git push -u --force-with-lease origin release/v1.0.0" ]]
}
