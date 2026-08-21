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
if grep -q 'addProjectV2DraftIssue' "$FILE"; then
  TITLE=$(jq -r '.variables.input.title' "$FILE")
  BODY=$(jq -r '.variables.input.body' "$FILE")
  COUNT=$(( $(grep -Ec '^(add|draft) ' "$MOVE_LOG" 2>/dev/null || true) + 1 ))
  NEW_ID="PVTI_NEW_${COUNT}"
  echo "draft $TITLE $BODY" >> "$MOVE_LOG"
  echo "{\"data\": {\"addProjectV2DraftIssue\": {\"projectV2Item\": {\"id\": \"$NEW_ID\"}}}}"
elif grep -q 'addProjectV2ItemById' "$FILE"; then
  CONTENT_ID=$(jq -r '.variables.input.contentId' "$FILE")
  COUNT=$(( $(grep -Ec '^(add|draft) ' "$MOVE_LOG" 2>/dev/null || true) + 1 ))
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
  OWNER_ID=$(jq -r '.variables.input.ownerId' "$FILE")
  echo "copy $TITLE $OWNER_ID" >> "$MOVE_LOG"
  jq -n --arg title "$TITLE" \
    '{data: {copyProjectV2: {projectV2: {id: "PVT_NEW", title: $title, url: "https://github.com/users/couimet/projects/2"}}}}'
elif grep -q 'items(first' "$FILE"; then
  CURSOR=$(jq -r '.variables.cursor // ""' "$FILE")
  if [[ -n "$CURSOR" ]]; then
    cat "$GH_ITEMS_RESPONSE_2"
  elif [[ "$(jq -r '.variables.id // ""' "$FILE")" == "PVT_NEW" ]]; then
    cat "$GH_ITEMS_RESPONSE_NEW"
  else
    cat "$GH_ITEMS_RESPONSE"
  fi
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
  {"id": "PVT_OLD", "title": "RangeLink v2.1.0 release", "url": "https://github.com/users/couimet/projects/1", "owner": {"id": "U_couimet"}}
]}}}}
EOF

  cat > "$FIXTURE_ROOT/gh-items.json" <<'EOF'
{"data": {"node": {"items": {"pageInfo": {"hasNextPage": false, "endCursor": null}, "nodes": [
  {"id": "PVTI_1", "content": {"__typename": "Issue", "id": "I_1"}, "statusValue": {"name": "In Progress"}},
  {"id": "PVTI_2", "content": {"__typename": "Issue", "id": "I_2"}, "statusValue": {"name": "Blocked"}, "priorityValue": {"name": "High"}, "sizeValue": {"name": "Large"}},
  {"id": "PVTI_3", "content": {"__typename": "Issue", "id": "I_3"}, "statusValue": {"name": "Done"}},
  {"id": "PVTI_4", "content": {"__typename": "Issue", "id": "I_4"}}
]}}}}
EOF

  # A fresh copied project has no items (copyProjectV2 excludes draft issues);
  # tests override this fixture when they need a populated destination.
  cat > "$FIXTURE_ROOT/gh-items-new.json" <<'EOF'
{"data": {"node": {"items": {"pageInfo": {"hasNextPage": false, "endCursor": null}, "nodes": []}}}}
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
  export GH_ITEMS_RESPONSE_2="$FIXTURE_ROOT/gh-items-2.json"
  export GH_ITEMS_RESPONSE_NEW="$FIXTURE_ROOT/gh-items-new.json"
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
copy RangeLink v2.2.0 release U_couimet
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

@test "reuses the existing next project as the migration destination" {
  setup_fixture
  cat > "$FIXTURE_ROOT/gh-projects.json" <<'EOF'
{"data": {"viewer": {"projectsV2": {"nodes": [
  {"id": "PVT_OLD", "title": "RangeLink v2.1.0 release", "url": "https://github.com/users/couimet/projects/1", "owner": {"id": "U_couimet"}},
  {"id": "PVT_NEXT", "title": "RangeLink v2.2.0 release", "url": "https://github.com/users/couimet/projects/2", "owner": {"id": "U_couimet"}}
]}}}}
EOF

  run "$SCRIPT"
  [[ "$status" -eq 0 ]]
  [[ "$output" == *"already exists"* ]]
  [[ "$output" == *"reusing it as the migration destination"* ]]
  [[ "$output" == *"Moved 3 item(s)"* ]]
  [[ "$output" == *"Next project: https://github.com/users/couimet/projects/2"* ]]
  ! grep -q '^copy ' "$MOVE_LOG"
  cat > "$FIXTURE_ROOT/expected-moves.log" <<'EOF'
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
}

@test "migrates items beyond the first page" {
  setup_fixture
  cat > "$FIXTURE_ROOT/gh-items.json" <<'EOF'
{"data": {"node": {"items": {"pageInfo": {"hasNextPage": true, "endCursor": "CUR1"}, "nodes": [
  {"id": "PVTI_1", "content": {"__typename": "Issue", "id": "I_1"}, "statusValue": {"name": "In Progress"}},
  {"id": "PVTI_2", "content": {"__typename": "Issue", "id": "I_2"}, "statusValue": {"name": "Blocked"}, "priorityValue": {"name": "High"}, "sizeValue": {"name": "Large"}},
  {"id": "PVTI_3", "content": {"__typename": "Issue", "id": "I_3"}, "statusValue": {"name": "Done"}},
  {"id": "PVTI_4", "content": {"__typename": "Issue", "id": "I_4"}}
]}}}}
EOF
  cat > "$FIXTURE_ROOT/gh-items-2.json" <<'EOF'
{"data": {"node": {"items": {"pageInfo": {"hasNextPage": false, "endCursor": null}, "nodes": [
  {"id": "PVTI_5", "content": {"__typename": "Issue", "id": "I_5"}, "statusValue": {"name": "In Progress"}}
]}}}}
EOF

  run "$SCRIPT"
  [[ "$status" -eq 0 ]]

  grep -q '^add I_5 PVTI_NEW_4$' "$MOVE_LOG"
  grep -q '^update PVTI_NEW_4 PVTF_s_new PVTO_ip$' "$MOVE_LOG"
  grep -q '^delete PVTI_5$' "$MOVE_LOG"
  [[ "$output" == *"Moved 4 item(s)"* ]]
}

@test "migrates DraftIssue items via addProjectV2DraftIssue" {
  setup_fixture
  cat > "$FIXTURE_ROOT/gh-items.json" <<'EOF'
{"data": {"node": {"items": {"pageInfo": {"hasNextPage": false, "endCursor": null}, "nodes": [
  {"id": "PVTI_1", "content": {"__typename": "DraftIssue", "id": "D_1", "title": "Draft title", "body": "Draft body"}, "statusValue": {"name": "In Progress"}}
]}}}}
EOF

  run "$SCRIPT"
  [[ "$status" -eq 0 ]]

  grep -q '^draft Draft title Draft body$' "$MOVE_LOG"
  grep -Fx '<!-- rangelink-source-item: PVTI_1 -->' "$MOVE_LOG"
  grep -q '^update PVTI_NEW_1 PVTF_s_new PVTO_ip$' "$MOVE_LOG"
  grep -q '^delete PVTI_1$' "$MOVE_LOG"
  [[ "$output" == *"Moved 1 item(s)"* ]]
}

@test "reuses a destination draft already carrying the source item marker on rerun" {
  setup_fixture
  cat > "$FIXTURE_ROOT/gh-items.json" <<'EOF'
{"data": {"node": {"items": {"pageInfo": {"hasNextPage": false, "endCursor": null}, "nodes": [
  {"id": "PVTI_1", "content": {"__typename": "DraftIssue", "id": "D_1", "title": "Draft title", "body": "Draft body"}, "statusValue": {"name": "In Progress"}}
]}}}}
EOF
  cat > "$FIXTURE_ROOT/gh-items-new.json" <<'EOF'
{"data": {"node": {"items": {"pageInfo": {"hasNextPage": false, "endCursor": null}, "nodes": [
  {"id": "PVTI_NEW_D", "content": {"__typename": "DraftIssue", "id": "D_NEW", "title": "Draft title", "body": "Draft body\n<!-- rangelink-source-item: PVTI_1 -->"}, "fieldValues": {"nodes": []}}
]}}}}
EOF

  run "$SCRIPT"
  [[ "$status" -eq 0 ]]

  ! grep -q '^draft ' "$MOVE_LOG"
  grep -q '^update PVTI_NEW_D PVTF_s_new PVTO_ip$' "$MOVE_LOG"
  grep -q '^delete PVTI_1$' "$MOVE_LOG"
  [[ "$output" == *"Moved 1 item(s)"* ]]
}

# ── Error paths ────────────────────────────────────────────────────────────────

@test "fails with a clear error when the current project is not found" {
  setup_fixture
  cat > "$FIXTURE_ROOT/gh-projects.json" <<'EOF'
{"data": {"viewer": {"projectsV2": {"nodes": [
  {"id": "PVT_PREV", "title": "RangeLink v2.0.0 release", "url": "https://github.com/users/couimet/projects/1", "owner": {"id": "U_couimet"}}
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
  head -1 "$MOVE_LOG" | grep -q '^copy RangeLink v3.0.0 release U_couimet$'
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
