#!/usr/bin/env bats

load test_helper

REAL_SCRIPT="$PROJECT_ROOT/packages/rangelink-vscode-extension/scripts/add-issue-to-release-board.sh"

setup_fixture() {
  export FIXTURE_ROOT="$TEST_TEMP_DIR"
  mkdir -p "$FIXTURE_ROOT/scripts"

  cp "$REAL_SCRIPT" "$FIXTURE_ROOT/scripts/add-issue-to-release-board.sh"
  cp "$PROJECT_ROOT/packages/rangelink-vscode-extension/scripts/release-board-lib.sh" "$FIXTURE_ROOT/scripts/"

  # Fake package.json so the version lookup works.
  cat > "$FIXTURE_ROOT/package.json" <<'EOF'
{"version": "9.9.9"}
EOF

  stub_dir

  export GH_CALL_LOG="$FIXTURE_ROOT/gh-calls.log"
  : > "$GH_CALL_LOG"
  export PROJECTS_RESPONSE_FILE="$FIXTURE_ROOT/projects-response.json"
  export ISSUE_VIEW_URL=""

  make_stub "gh" <<'ENDOFSTUB'
#!/usr/bin/env bash
echo "gh $*" >> "$GH_CALL_LOG"

case "${1:-}" in
  api)
    if [[ "${2:-}" == "user" ]]; then
      echo "couimet"
      exit 0
    fi
    if [[ "${2:-}" == "graphql" ]]; then
      payload="$4"
      echo "graphql --input $payload" >> "$GH_CALL_LOG"
      cat "$payload" >> "$GH_CALL_LOG"
      echo "" >> "$GH_CALL_LOG"
      if grep -q 'addProjectV2ItemById' "$payload"; then
        echo '{"data": {"addProjectV2ItemById": {"item": {"id": "ITEM_CROSS"}}}}'
      elif grep -q 'updateProjectV2ItemFieldValue' "$payload"; then
        echo '{"data": {"updateProjectV2ItemFieldValue": {"projectV2Item": {"id": "ITEM_CROSS"}}}}'
      elif grep -q 'projectsV2' "$payload"; then
        cat "$PROJECTS_RESPONSE_FILE"
      fi
      exit 0
    fi
    ;;
  issue)
    if [[ "${2:-}" == "view" ]]; then
      echo "issue view ${3}" >> "$GH_CALL_LOG"
      echo "NODE_CROSS"
      exit 0
    fi
    ;;
esac
exit 1
ENDOFSTUB

  SCRIPT="$FIXTURE_ROOT/scripts/add-issue-to-release-board.sh"
}

write_happy_projects() {
  cat > "$PROJECTS_RESPONSE_FILE" <<'EOF'
{"data": {"viewer": {"projectsV2": {"nodes": [
  {
    "id": "PVT_kwBOARD",
    "number": 12,
    "url": "https://github.com/users/couimet/projects/12",
    "title": "RangeLink v9.9.9 release",
    "fields": {"nodes": [
      {
        "id": "FIELD_STATUS",
        "name": "Status",
        "options": [
          {"id": "OPT_READY", "name": "Ready"},
          {"id": "OPT_IN_PROGRESS", "name": "In Progress"}
        ]
      }
    ]}
  },
  {
    "id": "PVT_kbOTHER",
    "number": 3,
    "url": "https://github.com/users/couimet/projects/3",
    "title": "RangeLink v9.8.0 release",
    "fields": {"nodes": []}
  }
]}}}}
EOF
}

# ── Happy path ─────────────────────────────────────────────────────────────────

@test "adds an issue from any repository to the release board with Status Ready" {
  setup_fixture
  write_happy_projects

  run "$SCRIPT" "https://github.com/couimet/couimet.github.io/issues/12"
  [[ "$status" -eq 0 ]]
  [[ "$output" =~ "Resolved release board: RangeLink v9.9.9 release (project #12)" ]]
  [[ "$output" =~ "Added: https://github.com/couimet/couimet.github.io/issues/12 to RangeLink v9.9.9 release (project #12), status: Ready" ]]
  [[ "$output" =~ "Board URL: https://github.com/users/couimet/projects/12" ]]

  # The board listing query.
  grep -q 'projectsV2' "$GH_CALL_LOG"

  # Cross-repo issue node id resolved via gh issue view.
  grep -Fq 'issue view https://github.com/couimet/couimet.github.io/issues/12' "$GH_CALL_LOG"

  # Item added with the resolved node id, then Status set to Ready.
  grep -Fq 'addProjectV2ItemById' "$GH_CALL_LOG"
  grep -Fq 'NODE_CROSS' "$GH_CALL_LOG"
  grep -Fq 'updateProjectV2ItemFieldValue' "$GH_CALL_LOG"
  grep -Fq 'OPT_READY' "$GH_CALL_LOG"
  grep -Fq 'ITEM_CROSS' "$GH_CALL_LOG"
}

# ── Error paths ─────────────────────────────────────────────────────────────────

@test "fails with candidate titles when the release board is not found" {
  setup_fixture
  cat > "$PROJECTS_RESPONSE_FILE" <<'EOF'
{"data": {"viewer": {"projectsV2": {"nodes": [
  {"id": "PVT_1", "number": 3, "url": "https://github.com/users/couimet/projects/3", "title": "RangeLink v9.8.0 release", "fields": {"nodes": []}},
  {"id": "PVT_2", "number": 7, "url": "https://github.com/users/couimet/projects/7", "title": "Backlog board", "fields": {"nodes": []}}
]}}}}
EOF

  run "$SCRIPT" "https://github.com/couimet/couimet.github.io/issues/12"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "no project board titled 'RangeLink v9.9.9 release'" ]]
  [[ "$output" =~ "RangeLink v9.8.0 release" ]]
  [[ "$output" =~ "Backlog board" ]]

  # Nothing was mutated.
  ! grep -q 'addProjectV2ItemById' "$GH_CALL_LOG"
}

@test "warns and skips status update when the board has no Ready option" {
  setup_fixture
  cat > "$PROJECTS_RESPONSE_FILE" <<'EOF'
{"data": {"viewer": {"projectsV2": {"nodes": [
  {
    "id": "PVT_kwBOARD",
    "number": 12,
    "url": "https://github.com/users/couimet/projects/12",
    "title": "RangeLink v9.9.9 release",
    "fields": {"nodes": [
      {
        "id": "FIELD_STATUS",
        "name": "Status",
        "options": [{"id": "OPT_IN_PROGRESS", "name": "In Progress"}]
      }
    ]}
  }
]}}}}
EOF

  run "$SCRIPT" "https://github.com/couimet/couimet.github.io/issues/12"
  [[ "$status" -eq 0 ]]
  [[ "$output" =~ "no 'Status' field with a 'Ready' option" ]]
  [[ "$output" =~ "status: unset" ]]
  [[ "$output" =~ "Board URL: https://github.com/users/couimet/projects/12" ]]

  # Item is still added to the board, but no status mutation runs.
  grep -Fq 'addProjectV2ItemById' "$GH_CALL_LOG"
  ! grep -q 'updateProjectV2ItemFieldValue' "$GH_CALL_LOG"
}

# ── Usage and dry-run ───────────────────────────────────────────────────────────

@test "missing issue URL prints usage" {
  setup_fixture

  run "$SCRIPT"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "Usage:" ]]
  [[ "$output" =~ "<issue-url>" ]]
}

@test "rejects a malformed issue URL" {
  setup_fixture

  run "$SCRIPT" "not-a-valid-url"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "must look like https://github.com/<owner>/<repo>/issues/<number>" ]]
}

@test "--dry-run prints the resolved inputs without calling gh" {
  setup_fixture

  run "$SCRIPT" --dry-run "https://github.com/couimet/couimet.github.io/issues/12"
  [[ "$status" -eq 0 ]]
  [[ "$output" =~ "DRY-RUN: would add https://github.com/couimet/couimet.github.io/issues/12 to 'RangeLink v9.9.9 release' with Status: Ready" ]]
  [[ ! -s "$GH_CALL_LOG" ]]
}
