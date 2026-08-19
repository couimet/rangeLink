#!/usr/bin/env bats

load test_helper

REAL_SCRIPT="$PROJECT_ROOT/packages/rangelink-vscode-extension/scripts/rotate-release-board.sh"

setup_fixture() {
  export FIXTURE_ROOT="$TEST_TEMP_DIR"
  mkdir -p "$FIXTURE_ROOT/scripts"

  cp "$REAL_SCRIPT" "$FIXTURE_ROOT/scripts/rotate-release-board.sh"
  cp "$PROJECT_ROOT/packages/rangelink-vscode-extension/scripts/release-board-lib.sh" "$FIXTURE_ROOT/scripts/"

  # Fake package.json so the version lookup works.
  cat > "$FIXTURE_ROOT/package.json" <<'EOF'
{"version": "2.1.0"}
EOF

  stub_dir

  make_stub "gh" <<'ENDOFSTUB'
#!/usr/bin/env bash
echo "gh $*" >> "$GH_CALL_LOG"
FILE=""
for arg in "$@"; do
  [[ -f "$arg" ]] && FILE="$arg" && break
done
if [[ -z "$FILE" ]]; then
  exit 0
fi
if grep -q 'addProjectV2ItemById' "$FILE"; then
  CONTENT_ID=$(jq -r '.variables.input.contentId' "$FILE")
  COUNT=$(( $(grep -c '^add ' "$MOVE_LOG" 2>/dev/null || true) + 1 ))
  NEW_ID="PVTI_NEW_${COUNT}"
  echo "add $CONTENT_ID $NEW_ID" >> "$MOVE_LOG"
  echo "{\"data\": {\"addProjectV2ItemById\": {\"item\": {\"id\": \"$NEW_ID\"}}}}"
elif grep -q 'updateProjectV2ItemFieldValue' "$FILE"; then
  ITEM_ID=$(jq -r '.variables.input.itemId' "$FILE")
  FIELD_ID=$(jq -r '.variables.input.fieldId' "$FILE")
  OPTION_ID=$(jq -r '.variables.input.value.singleSelectOptionId' "$FILE")
  echo "update $ITEM_ID $FIELD_ID $OPTION_ID" >> "$MOVE_LOG"
  echo '{"data": {"updateProjectV2ItemFieldValue": {"projectV2Item": {"id": "'"$ITEM_ID"'"}}}}'
elif grep -q 'deleteProjectV2Item' "$FILE"; then
  ITEM_ID=$(jq -r '.variables.input.itemId' "$FILE")
  echo "delete $ITEM_ID" >> "$MOVE_LOG"
  echo '{"data": {"deleteProjectV2Item": {"deletedItemId": "'"$ITEM_ID"'"}}}'
elif grep -q 'copyProjectV2' "$FILE"; then
  TITLE=$(jq -r '.variables.input.title' "$FILE")
  echo "copy $TITLE" >> "$MOVE_LOG"
  jq -n --arg title "$TITLE" \
    '{data: {copyProjectV2: {projectV2: {id: "PVT_NEW", title: $title, url: "https://github.com/users/couimet/projects/2"}}}}'
elif grep -q 'items(first' "$FILE"; then
  cat "$GH_ITEMS_RESPONSE"
elif grep -q 'projectsV2' "$FILE"; then
  cat "$GH_PROJECTS_RESPONSE"
elif grep -q 'SingleSelectField' "$FILE"; then
  cat "$GH_FIELDS_RESPONSE"
else
  cat "$GH_PROJECTS_RESPONSE"
fi
ENDOFSTUB

  cat > "$FIXTURE_ROOT/gh-projects.json" <<'EOF'
{"data": {"viewer": {"projectsV2": {"nodes": [
  {"id": "PVT_OLD", "title": "RangeLink v2.1.0 release", "url": "https://github.com/users/couimet/projects/1"}
]}}}}
EOF

  cat > "$FIXTURE_ROOT/gh-items.json" <<'EOF'
{"data": {"node": {"items": {"nodes": [
  {"id": "PVTI_1", "content": {"id": "I_1"}, "fieldValues": {"nodes": [{"name": "In Progress", "field": {"name": "Status"}}]}},
  {"id": "PVTI_2", "content": {"id": "I_2"}, "fieldValues": {"nodes": [
    {"name": "Blocked", "field": {"name": "Status"}},
    {"name": "High", "field": {"name": "Priority"}},
    {"name": "Large", "field": {"name": "Size"}}
  ]}},
  {"id": "PVTI_3", "content": {"id": "I_3"}, "fieldValues": {"nodes": [{"name": "Done", "field": {"name": "Status"}}]}},
  {"id": "PVTI_4", "content": {"id": "I_4"}, "fieldValues": {"nodes": []}}
]}}}}
EOF

  cat > "$FIXTURE_ROOT/gh-fields.json" <<'EOF'
{"data": {"node": {"fields": {"nodes": [
  {"id": "PVTF_s_new", "name": "Status", "options": [{"id": "PVTO_done", "name": "Done"}, {"id": "PVTO_ip", "name": "In Progress"}, {"id": "PVTO_blocked", "name": "Blocked"}]},
  {"id": "PVTF_p_new", "name": "Priority", "options": [{"id": "PVTO_high", "name": "High"}]},
  {"id": "PVTF_sz_new", "name": "Size", "options": [{"id": "PVTO_large", "name": "Large"}]}
]}}}}
EOF

  export GH_CALL_LOG="$FIXTURE_ROOT/gh-calls.log"
  export MOVE_LOG="$FIXTURE_ROOT/move-ops.log"
  export GH_PROJECTS_RESPONSE="$FIXTURE_ROOT/gh-projects.json"
  export GH_ITEMS_RESPONSE="$FIXTURE_ROOT/gh-items.json"
  export GH_FIELDS_RESPONSE="$FIXTURE_ROOT/gh-fields.json"
  : > "$GH_CALL_LOG"
  : > "$MOVE_LOG"

  SCRIPT="$FIXTURE_ROOT/scripts/rotate-release-board.sh"
}

# ── Move order ─────────────────────────────────────────────────────────────────

@test "moves non-Done items in order, restoring Status, Priority, and Size" {
  setup_fixture

  run "$SCRIPT"
  [[ "$status" -eq 0 ]]

  # Exact move sequence: create next project, then per item add → restore
  # fields → delete. The Done item (I_3) is untouched; the item without a
  # Status (I_4) is moved with no field restores.
  cat > "$FIXTURE_ROOT/expected-moves.log" <<'EOF'
copy RangeLink v2.2.0 release
add I_1 PVTI_NEW_1
update PVTI_NEW_1 PVTF_s_new PVTO_ip
delete PVTI_1
add I_2 PVTI_NEW_2
update PVTI_NEW_2 PVTF_s_new PVTO_blocked
update PVTI_NEW_2 PVTF_p_new PVTO_high
update PVTI_NEW_2 PVTF_sz_new PVTO_large
delete PVTI_2
add I_4 PVTI_NEW_3
delete PVTI_4
EOF
  diff -u "$FIXTURE_ROOT/expected-moves.log" "$MOVE_LOG"

  [[ "$output" == *"Moved 3 item(s)"* ]]
  [[ "$output" == *"Next project: https://github.com/users/couimet/projects/2"* ]]
  [[ "$output" == *"Old project left open: RangeLink v2.1.0 release"* ]]
}

# ── Idempotency ────────────────────────────────────────────────────────────────

@test "skips when the next project already exists" {
  setup_fixture
  cat > "$FIXTURE_ROOT/gh-projects.json" <<'EOF'
{"data": {"viewer": {"projectsV2": {"nodes": [
  {"id": "PVT_OLD", "title": "RangeLink v2.1.0 release", "url": "https://github.com/users/couimet/projects/1"},
  {"id": "PVT_NEXT", "title": "RangeLink v2.2.0 release", "url": "https://github.com/users/couimet/projects/2"}
]}}}}
EOF

  run "$SCRIPT"
  [[ "$status" -eq 0 ]]
  [[ "$output" == *"already exists"* ]]
  [[ "$output" == *"skipping rotation"* ]]
  [[ ! -s "$MOVE_LOG" ]]
}

# ── Error paths ────────────────────────────────────────────────────────────────

@test "fails with a clear error when the current project is not found" {
  setup_fixture
  cat > "$FIXTURE_ROOT/gh-projects.json" <<'EOF'
{"data": {"viewer": {"projectsV2": {"nodes": [
  {"id": "PVT_PREV", "title": "RangeLink v2.0.0 release", "url": "https://github.com/users/couimet/projects/1"}
]}}}}
EOF

  run "$SCRIPT"
  [[ "$status" -eq 1 ]]
  [[ "$output" == *"no project titled 'RangeLink v2.1.0 release' found"* ]]
  [[ "$output" == *"Available projects:"* ]]
  [[ "$output" == *"RangeLink v2.0.0 release"* ]]
  [[ ! -s "$MOVE_LOG" ]]
}

# ── Version handling ───────────────────────────────────────────────────────────

@test "explicit next version overrides the default minor bump" {
  setup_fixture

  run "$SCRIPT" "3.0.0"
  [[ "$status" -eq 0 ]]
  head -1 "$MOVE_LOG" | grep -q '^copy RangeLink v3.0.0 release$'
}

@test "invalid next version exits 1" {
  setup_fixture

  run "$SCRIPT" "3.0"
  [[ "$status" -eq 1 ]]
  [[ "$output" == *"next version must be SemVer"* ]]
}

# ── Dry run ────────────────────────────────────────────────────────────────────

@test "--dry-run prints the plan without calling gh" {
  setup_fixture

  run "$SCRIPT" --dry-run
  [[ "$status" -eq 0 ]]
  [[ "$output" == *"DRY RUN"* ]]
  [[ "$output" == *"would create project 'RangeLink v2.2.0 release'"* ]]
  [[ ! -s "$GH_CALL_LOG" ]]
}

# ── Argument validation ────────────────────────────────────────────────────────

@test "unknown argument exits 1" {
  setup_fixture

  run "$SCRIPT" --bogus
  [[ "$status" -eq 1 ]]
  [[ "$output" == *"Unknown argument: --bogus"* ]]
}
