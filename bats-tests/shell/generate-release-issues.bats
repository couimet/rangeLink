#!/usr/bin/env bats

load test_helper

REAL_SCRIPT="$PROJECT_ROOT/packages/rangelink-vscode-extension/scripts/generate-release-issues.sh"

setup_fixture() {
  export FIXTURE_ROOT="$TEST_TEMP_DIR"
  mkdir -p "$FIXTURE_ROOT/scripts"

  cp "$REAL_SCRIPT" "$FIXTURE_ROOT/scripts/generate-release-issues.sh"
  cp "$PROJECT_ROOT/packages/rangelink-vscode-extension/scripts/release-board-lib.sh" "$FIXTURE_ROOT/scripts/"

  # Fake package.json so the version lookup works.
  cat > "$FIXTURE_ROOT/package.json" <<'EOF'
{"version": "9.9.9"}
EOF

  stub_dir

  export GH_CALL_LOG="$FIXTURE_ROOT/gh-calls.log"
  : > "$GH_CALL_LOG"
  export ISSUE_BODY_LOG="$FIXTURE_ROOT/issue-body.log"
  export ISSUE_CREATE_URL="https://github.com/couimet/rangeLink/issues/1000"
  export PROJECTS_RESPONSE_FILE="$FIXTURE_ROOT/projects-response.json"

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
        if grep -q 'NODE_QA' "$payload"; then
          echo '{"data": {"addProjectV2ItemById": {"item": {"id": "ITEM_QA"}}}}'
        else
          echo '{"data": {"addProjectV2ItemById": {"item": {"id": "ITEM_DEVTO"}}}}'
        fi
      elif grep -q 'updateProjectV2ItemFieldValue' "$payload"; then
        echo '{"data": {"updateProjectV2ItemFieldValue": {"projectV2Item": {"id": "ITEM_DEVTO"}}}}'
      elif grep -q 'issue(number:' "$payload"; then
        echo '{"data": {"repository": {"devto": {"id": "NODE_DEVTO"}, "qa": {"id": "NODE_QA"}}}}'
      elif grep -q 'projectsV2' "$payload"; then
        cat "$PROJECTS_RESPONSE_FILE"
      fi
      exit 0
    fi
    ;;
  issue)
    if [[ "${2:-}" == "create" ]]; then
      echo "issue create title=$4" >> "$GH_CALL_LOG"
      echo "issue create repo=${8:-}" >> "$GH_CALL_LOG"
      echo "$6" > "$ISSUE_BODY_LOG"
      echo "$ISSUE_CREATE_URL"
      exit 0
    fi
    ;;
esac
exit 1
ENDOFSTUB

  SCRIPT="$FIXTURE_ROOT/scripts/generate-release-issues.sh"
}

write_happy_projects() {
  cat > "$PROJECTS_RESPONSE_FILE" <<'EOF'
{"data": {"viewer": {"projectsV2": {"nodes": [
  {
    "id": "PVT_kwBOARD",
    "number": 12,
    "title": "RangeLink v9.9.9 release",
    "fields": {"nodes": [
      {
        "id": "FIELD_STATUS",
        "name": "Status",
        "options": [
          {"id": "OPT_READY", "name": "Ready"},
          {"id": "OPT_IN_PROGRESS", "name": "In Progress"}
        ]
      },
      {
        "id": "FIELD_PRIORITY",
        "name": "Priority",
        "options": [{"id": "OPT_HIGH", "name": "High"}]
      }
    ]}
  },
  {
    "id": "PVT_kbOTHER",
    "number": 3,
    "title": "RangeLink v9.8.0 release",
    "fields": {"nodes": []}
  }
]}}}}
EOF
}

# ── Happy path ─────────────────────────────────────────────────────────────────

@test "creates dev.to issue and adds both issues to the release board" {
  setup_fixture
  write_happy_projects

  run "$SCRIPT" "https://github.com/couimet/rangeLink/issues/555"
  [[ "$status" -eq 0 ]]
  [[ "$output" =~ "Created: https://github.com/couimet/rangeLink/issues/1000" ]]
  [[ "$output" =~ "Resolved release board: RangeLink v9.9.9 release (project #12)" ]]

  # The board listing query.
  grep -q 'projectsV2' "$GH_CALL_LOG"

  # Issue create: title, body, and pinned repo (must match the GraphQL lookup repo).
  grep -Fq 'issue create title=Prepare dev.to post for v9.9.9 release' "$GH_CALL_LOG"
  grep -Fq 'issue create repo=couimet/rangeLink' "$GH_CALL_LOG"
  grep -Fq 'Draft article written (after feature freeze)' "$ISSUE_BODY_LOG"

  # GraphQL node id resolution for both issues.
  grep -Fq 'issue(number: 1000)' "$GH_CALL_LOG"
  grep -Fq 'issue(number: 555)' "$GH_CALL_LOG"

  # Both items added to the board.
  grep -Fq 'addProjectV2ItemById' "$GH_CALL_LOG"
  grep -Fq 'NODE_DEVTO' "$GH_CALL_LOG"
  grep -Fq 'NODE_QA' "$GH_CALL_LOG"

  # Status set to Ready for each added item (item ids flow into the mutation).
  grep -Fq 'updateProjectV2ItemFieldValue' "$GH_CALL_LOG"
  grep -Fq 'OPT_READY' "$GH_CALL_LOG"
  grep -Fq 'ITEM_DEVTO' "$GH_CALL_LOG"
  grep -Fq 'ITEM_QA' "$GH_CALL_LOG"

  # Board summary lines reference both issues.
  [[ "$output" =~ "dev.to issue: https://github.com/couimet/rangeLink/issues/1000" ]]
  [[ "$output" =~ "QA issue: https://github.com/couimet/rangeLink/issues/555" ]]
}

@test "issue title and body follow the dev.to post template" {
  setup_fixture
  write_happy_projects

  run "$SCRIPT" "https://github.com/couimet/rangeLink/issues/555"
  [[ "$status" -eq 0 ]]

  grep -Fq 'issue create title=Prepare dev.to post for v9.9.9 release' "$GH_CALL_LOG"
  grep -Fq 'Prepare a dev.to article announcing the RangeLink v9.9.9 release' "$ISSUE_BODY_LOG"
  grep -Fq -- '- [ ] Draft article written (after feature freeze)' "$ISSUE_BODY_LOG"
  grep -Fq -- '- [ ] Screenshots/GIFs prepared' "$ISSUE_BODY_LOG"
  grep -Fq -- '- [ ] Article reviewed' "$ISSUE_BODY_LOG"
  grep -Fq -- '- [ ] Ready to publish on release day' "$ISSUE_BODY_LOG"
  grep -Fq 'media/devto-post-vscode-extension-v9.9.9.md' "$ISSUE_BODY_LOG"
  grep -Fq 'packages/rangelink-vscode-extension/README.md#featured-in' "$ISSUE_BODY_LOG"
}

# ── Error paths ─────────────────────────────────────────────────────────────────

@test "fails with candidate titles when the release board is not found" {
  setup_fixture
  cat > "$PROJECTS_RESPONSE_FILE" <<'EOF'
{"data": {"viewer": {"projectsV2": {"nodes": [
  {"id": "PVT_1", "number": 3, "title": "RangeLink v9.8.0 release", "fields": {"nodes": []}},
  {"id": "PVT_2", "number": 7, "title": "Backlog board", "fields": {"nodes": []}}
]}}}}
EOF

  run "$SCRIPT" "https://github.com/couimet/rangeLink/issues/555"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "no project board titled 'RangeLink v9.9.9 release'" ]]
  [[ "$output" =~ "RangeLink v9.8.0 release" ]]
  [[ "$output" =~ "Backlog board" ]]

  # Nothing was created or mutated.
  ! grep -q 'issue create' "$GH_CALL_LOG"
  ! grep -q 'addProjectV2ItemById' "$GH_CALL_LOG"
}

@test "warns and skips status updates when the board has no Ready option" {
  setup_fixture
  cat > "$PROJECTS_RESPONSE_FILE" <<'EOF'
{"data": {"viewer": {"projectsV2": {"nodes": [
  {
    "id": "PVT_kwBOARD",
    "number": 12,
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

  run "$SCRIPT" "https://github.com/couimet/rangeLink/issues/555"
  [[ "$status" -eq 0 ]]
  [[ "$output" =~ "no 'Status' field with a 'Ready' option" ]]
  [[ "$output" =~ "status: unset" ]]

  # Items are still added to the board.
  grep -Fq 'addProjectV2ItemById' "$GH_CALL_LOG"
  grep -Fq 'NODE_DEVTO' "$GH_CALL_LOG"
  grep -Fq 'NODE_QA' "$GH_CALL_LOG"

  # But no status mutation runs.
  ! grep -q 'updateProjectV2ItemFieldValue' "$GH_CALL_LOG"
}

# ── Usage and dry-run ───────────────────────────────────────────────────────────

@test "missing QA issue URL prints usage" {
  setup_fixture

  run "$SCRIPT"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "Usage:" ]]
  [[ "$output" =~ "<qa-issue-url>" ]]
}

@test "rejects a malformed QA issue URL" {
  setup_fixture

  run "$SCRIPT" "not-a-valid-url"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "must look like https://github.com/<owner>/<repo>/issues/<number>" ]]
}

@test "--dry-run prints the issue without calling gh" {
  setup_fixture

  run "$SCRIPT" --dry-run "https://github.com/couimet/rangeLink/issues/555"
  [[ "$status" -eq 0 ]]
  [[ "$output" =~ "DRY-RUN issue: Prepare dev.to post for v9.9.9 release" ]]
  [[ "$output" =~ "--- Body ---" ]]
  [[ "$output" =~ "Ready to publish on release day" ]]
  [[ ! -s "$GH_CALL_LOG" ]]
}
