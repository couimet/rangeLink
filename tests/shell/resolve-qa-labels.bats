#!/usr/bin/env bats

load test_helper

REAL_SCRIPT="$PROJECT_ROOT/packages/rangelink-vscode-extension/scripts/resolve-qa-labels.js"

setup_fixture() {
  FIXTURE_ROOT="$TEST_TEMP_DIR"
  mkdir -p "$FIXTURE_ROOT/scripts"
  mkdir -p "$FIXTURE_ROOT/qa"
  cp "$REAL_SCRIPT" "$FIXTURE_ROOT/scripts/resolve-qa-labels.js"
  SCRIPT="$FIXTURE_ROOT/scripts/resolve-qa-labels.js"
}

write_yaml() {
  cat > "$FIXTURE_ROOT/qa/$1"
}

# ════════════════════════════════════════════════════════════════════
# Argument parsing
# ════════════════════════════════════════════════════════════════════

@test "resolve-qa-labels: --help exits 0" {
  run node "$REAL_SCRIPT" --help
  [[ "$status" -eq 0 ]]
  [[ "$output" =~ "Usage:" ]]
}

@test "resolve-qa-labels: unknown option exits 1" {
  run node "$REAL_SCRIPT" --bogus-flag
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "Unknown option:" ]]
}

@test "resolve-qa-labels: --label without value (no next arg) exits 1" {
  run node "$REAL_SCRIPT" --label
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "--label requires a value" ]]
}

@test "resolve-qa-labels: --label without value (next arg is flag) exits 1" {
  run node "$REAL_SCRIPT" --label --assisted
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "--label requires a value" ]]
}

@test "resolve-qa-labels: --label with value accepted" {
  # Use a nonexistent file — /dev/null is a valid read (empty), which parses
  # successfully and exits 0. A nonexistent file proves arg parsing passed
  # by reaching readFileSync and failing there.
  local yml="$TEST_TEMP_DIR/nonexistent.yaml"
  run node "$REAL_SCRIPT" --label cursor --yaml "$yml"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "Cannot read YAML" ]]
}

@test "resolve-qa-labels: --exclude-label without value exits 1" {
  run node "$REAL_SCRIPT" --exclude-label
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "--exclude-label requires a value" ]]
}

@test "resolve-qa-labels: --format without value exits 1" {
  run node "$REAL_SCRIPT" --format
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "--format requires a value" ]]
}

@test "resolve-qa-labels: --format with invalid value exits 1" {
  run node "$REAL_SCRIPT" --format tsv
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "--format must be" ]]
}

@test "resolve-qa-labels: --yaml without value exits 1" {
  run node "$REAL_SCRIPT" --yaml
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "--yaml requires a value" ]]
}

@test "resolve-qa-labels: --assisted and --exclude-assisted mutually exclusive" {
  run node "$REAL_SCRIPT" --assisted --exclude-assisted
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "mutually exclusive" ]]
}

@test "resolve-qa-labels: --no-assisted synonym for --exclude-assisted works" {
  yml="$TEST_TEMP_DIR/no-assisted-syn.yaml"
  cat > "$yml" <<'EOF'
test_cases:
  - id: assisted-001
    feature: Test
    scenario: Assisted TC
    automated: assisted
  - id: auto-001
    feature: Test
    scenario: Automated TC
    automated: true
EOF
  run node "$REAL_SCRIPT" --yaml "$yml" --no-assisted
  [[ "$status" -eq 0 ]]
  [[ "$output" == "auto-001" ]] # only automated: true
}

# ════════════════════════════════════════════════════════════════════
# YAML discovery
# ════════════════════════════════════════════════════════════════════

@test "resolve-qa-labels: --yaml with nonexistent file exits 1" {
  run node "$REAL_SCRIPT" --yarn /nonexistent/path.yaml --json
  # Wrong: --yarn is unknown option; use --yaml
  run node "$REAL_SCRIPT" --yaml /nonexistent/path.yaml
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "Cannot read YAML" ]]
}

@test "resolve-qa-labels: explicit --yaml skips auto-discovery" {
  yml="$TEST_TEMP_DIR/custom.yaml"
  cat > "$yml" <<'EOF'
test_cases:
  - id: custom-001
    feature: Custom
    scenario: Custom path
    automated: true
EOF
  run node "$REAL_SCRIPT" --yaml "$yml"
  [[ "$status" -eq 0 ]]
  [[ "$output" == "custom-001" ]]
}

@test "resolve-qa-labels: readdirSync fails exits 1" {
  FIXTURE_ROOT="$TEST_TEMP_DIR"
  mkdir -p "$FIXTURE_ROOT/scripts"
  # Intentionally NOT creating qa/ directory
  cp "$REAL_SCRIPT" "$FIXTURE_ROOT/scripts/resolve-qa-labels.js"
  SCRIPT="$FIXTURE_ROOT/scripts/resolve-qa-labels.js"

  run node "$SCRIPT"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "Cannot read QA directory" ]]
}

@test "resolve-qa-labels: no QA YAML files exits 1" {
  setup_fixture
  # qa/ directory exists but is empty (no yaml files) or has non-matching files
  # Just make sure qa/ exists with no yaml files
  run node "$SCRIPT"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "No QA YAML files found" ]]
}

@test "resolve-qa-labels: unsuffixed preferred over suffixed same version" {
  setup_fixture
  write_yaml "qa-test-cases-v1.0.0-001.yaml" <<'EOF'
test_cases:
  - id: old-001
    feature: Old
    scenario: Suffixed
    automated: true
EOF
  write_yaml "qa-test-cases-v1.0.0.yaml" <<'EOF'
test_cases:
  - id: latest-001
    feature: Latest
    scenario: Unsuffixed
    automated: true
EOF
  run node "$SCRIPT"
  [[ "$output" == "latest-001" ]]
}

@test "resolve-qa-labels: highest version picked among unsuffixed" {
  setup_fixture
  write_yaml "qa-test-cases-v1.0.0.yaml" <<'EOF'
test_cases:
  - id: old-001
    feature: Old
    scenario: v1.0.0
    automated: true
EOF
  write_yaml "qa-test-cases-v2.0.0.yaml" <<'EOF'
test_cases:
  - id: new-001
    feature: New
    scenario: v2.0.0
    automated: true
EOF
  run node "$SCRIPT"
  [[ "$output" == "new-001" ]]
}

@test "resolve-qa-labels: highest suffixed picked when only suffixed exist" {
  setup_fixture
  write_yaml "qa-test-cases-v1.0.0-001.yaml" <<'EOF'
test_cases:
  - id: first-001
    feature: First
    scenario: 001
    automated: true
EOF
  write_yaml "qa-test-cases-v1.0.0-005.yaml" <<'EOF'
test_cases:
  - id: fifth-001
    feature: Fifth
    scenario: 005
    automated: true
EOF
  run node "$SCRIPT"
  [[ "$output" == "fifth-001" ]]
}

@test "resolve-qa-labels: auto-discovery picks qa-test-cases-unreleased.yaml when it is the only file" {
  setup_fixture
  write_yaml "qa-test-cases-unreleased.yaml" <<'EOF'
test_cases:
  - id: unreleased-001
    feature: Unreleased
    scenario: Single file
    automated: true
EOF
  run node "$SCRIPT"
  [[ "$status" -eq 0 ]]
  [[ "$output" == "unreleased-001" ]]
}

@test "resolve-qa-labels: auto-discovery prefers unreleased.yaml when both unreleased and versioned files exist" {
  setup_fixture
  write_yaml "qa-test-cases-v1.2.3.yaml" <<'EOF'
test_cases:
  - id: versioned-001
    feature: Versioned
    scenario: From versioned file
    automated: true
EOF
  write_yaml "qa-test-cases-unreleased.yaml" <<'EOF'
test_cases:
  - id: unreleased-001
    feature: Unreleased
    scenario: From unreleased file
    automated: true
EOF
  run node "$SCRIPT"
  [[ "$status" -eq 0 ]]
  [[ "$output" == "unreleased-001" ]]
}

# ════════════════════════════════════════════════════════════════════
# YAML parsing
# ════════════════════════════════════════════════════════════════════

@test "resolve-qa-labels: parses all field types with quoting variants" {
  yml="$TEST_TEMP_DIR/parse-all.yaml"
  cat > "$yml" <<'EOF'
# Comment before first TC should be skipped
test_cases:
  - id: first-001
    feature: 'Single Quoted'
    scenario: "Double Quoted"
    automated: "true"
    non_automatable_reason: 'Has reason'

  - id: second-002
    feature: Unquoted
    scenario: Unquoted
    automated: assisted

  - id: third-003
    feature: "Double Feature"
    scenario: 'Double Scenario'
    automated: false
    labels:
      - cursor
      - requires-extensions
EOF

  run node "$REAL_SCRIPT" --yaml "$yml" --json
  [[ "$status" -eq 0 ]]

  # Verify the JSON parses and contains expected values
  node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
  const groups = d.groups;
  // Should have 2 groups: first and second (third is a prefix, along with first/second)
  // first-001 → prefix 'first', second-002 → prefix 'second', third-003 → prefix 'third'
  // All have nonAutomated > 0 (first-001 is true, wait no - automated: 'true' means automated: true)
  // first-001: automated: \"true\" → parsed as 'true' → automated === 'true' → NOT automated in JSON terms...
  // Actually in JSON output, first-001 has automated: 'true' so it stays in group, contributes to featureCounts, but NOT to assisted/manual. So nonAutomated = 0 for 'first' → SKIPPED.
  // second-002: automated: 'assisted' → nonAutomated += 1
  // third-003: automated: 'false' → cursor TC label → goes to cursorTcs → skipped from group
  // So only 'second' group should appear
  if (groups.length !== 1) process.exit(1);
  if (groups[0].prefix !== 'second') process.exit(2);
  if (groups[0].assisted !== 1) process.exit(3);
  if (groups[0].manual !== 0) process.exit(4);
  // cursor_tcs should have third-003
  if (d.cursor_tcs.length !== 1) process.exit(5);
  if (d.cursor_tcs[0].id !== 'third-003') process.exit(6);
  if (d.cursor_tcs[0].automated !== false) process.exit(7);  // boolean false
  // requires-extensions from third-003 but group is skipped, so no requires_extensions in output
" <<< "$output"
}

@test "resolve-qa-labels: parses single-quoted automated and labels" {
  yml="$TEST_TEMP_DIR/single-quoted.yaml"
  cat > "$yml" <<'EOF'
test_cases:
  - id: quoted-001
    feature: Test
    scenario: Test
    automated: 'assisted'
    labels:
      - ubuntu
EOF
  run node "$REAL_SCRIPT" --yaml "$yml" --json
  [[ "$status" -eq 0 ]]
  echo "$output" | grep -q '"ubuntu_tcs"'
}

@test "resolve-qa-labels: lines before first TC are skipped" {
  yml="$TEST_TEMP_DIR/skip-lines.yaml"
  cat > "$yml" <<'EOF'
# This is a comment line
# Another comment
test_cases:
  - id: first-001
    feature: First
    scenario: After comments
    automated: true
EOF
  run node "$REAL_SCRIPT" --yaml "$yml"
  [[ "$status" -eq 0 ]]
  [[ "$output" == "first-001" ]]
}

@test "resolve-qa-labels: label mode exits on unrecognized key" {
  # This tests branch: inLabels && non-label key causes exit
  yml="$TEST_TEMP_DIR/label-exit.yaml"
  cat > "$yml" <<'EOF'
test_cases:
  - id: label-exit-001
    feature: Test
    scenario: Test
    automated: false
    labels:
      - cursor
    unknown_extra_field: value
EOF
  run node "$REAL_SCRIPT" --yaml "$yml"
  [[ "$status" -eq 0 ]]
  # If parsing succeeded, we get output. If it broke, we'd get an error.
  [[ "$output" == "label-exit-001" ]]
}

@test "resolve-qa-labels: lines within TC that dont match any field are silently skipped" {
  yml="$TEST_TEMP_DIR/fallthrough.yaml"
  cat > "$yml" <<'EOF'
test_cases:
  - id: fall-001
    feature: Fall
    scenario: Through
    automated: true
    garbage: should be silently skipped
EOF
  run node "$REAL_SCRIPT" --yaml "$yml"
  [[ "$status" -eq 0 ]]
  [[ "$output" == "fall-001" ]]
}

# ════════════════════════════════════════════════════════════════════
# JSON output — group structure
# ════════════════════════════════════════════════════════════════════

@test "resolve-qa-labels: JSON groups by prefix, most common feature" {
  yml="$TEST_TEMP_DIR/json-feature.yaml"
  cat > "$yml" <<'EOF'
test_cases:
  - id: multi-001
    feature: 'Feature A'
    scenario: A1
    automated: false
    non_automatable_reason: 'Reason 1'

  - id: multi-002
    feature: 'Feature A'
    scenario: A2
    automated: false
    non_automatable_reason: 'Reason 2'

  - id: multi-003
    feature: 'Feature B'
    scenario: B1
    automated: false
    non_automatable_reason: 'Reason 3'
EOF
  run node "$REAL_SCRIPT" --yaml "$yml" --json
  [[ "$status" -eq 0 ]]
  node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
if (d.groups.length !== 1) process.exit(1);
const g = d.groups[0];
if (g.prefix !== 'multi') process.exit(2);
if (g.feature !== 'Feature A') process.exit(3);
if (g.assisted !== 0) process.exit(4);
if (g.manual !== 3) process.exit(5);
if (g.total !== 3) process.exit(6);
if (g.requires_extensions !== false) process.exit(7);
if (!g.reasons) process.exit(8);
if (g.reasons['Reason 1'] !== 1) process.exit(9);
if (g.reasons['Reason 2'] !== 1) process.exit(10);
if (g.reasons['Reason 3'] !== 1) process.exit(11);
" <<< "$output"
}

@test "resolve-qa-labels: JSON skips groups with nonAutomated === 0" {
  yml="$TEST_TEMP_DIR/json-skip-zero.yaml"
  cat > "$yml" <<'EOF'
test_cases:
  - id: auto-001
    feature: All Automated
    scenario: Auto 1
    automated: true

  - id: auto-002
    feature: All Automated
    scenario: Auto 2
    automated: true
EOF
  run node "$REAL_SCRIPT" --yaml "$yml" --json
  node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
  if (d.groups.length !== 0) process.exit(1);
  if (d.total_assisted !== 0) process.exit(2);
  if (d.total_manual !== 0) process.exit(3);
" <<< "$output"
}

@test "resolve-qa-labels: JSON group without reasons omits reasons field" {
  yml="$TEST_TEMP_DIR/json-no-reasons.yaml"
  cat > "$yml" <<'EOF'
test_cases:
  - id: assist-001
    feature: Only Assisted
    scenario: Assisted 1
    automated: assisted
EOF
  run node "$REAL_SCRIPT" --yaml "$yml" --json
  node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
  if (d.groups.length !== 1) process.exit(1);
  const g = d.groups[0];
  if (g.assisted !== 1) process.exit(2);
  if (g.manual !== 0) process.exit(3);
  if (g.total !== 1) process.exit(4);
  // reasons field should NOT exist
  if (g.reasons !== undefined) process.exit(5);
" <<< "$output"
}

@test "resolve-qa-labels: JSON group with unspecified reason uses 'unspecified'" {
  yml="$TEST_TEMP_DIR/json-unspecified.yaml"
  cat > "$yml" <<'EOF'
test_cases:
  - id: no-reason-001
    feature: No Reason
    scenario: Missing reason
    automated: false
EOF
  run node "$REAL_SCRIPT" --yaml "$yml" --json
  echo "$output" | grep -q '"unspecified"'
}

@test "resolve-qa-labels: JSON id without dash-digit pattern uses raw id as prefix" {
  yml="$TEST_TEMP_DIR/json-bare-id.yaml"
  cat > "$yml" <<'EOF'
test_cases:
  - id: bare
    feature: Bare ID
    scenario: No dash digits
    automated: false
    non_automatable_reason: 'Testing'
EOF
  run node "$REAL_SCRIPT" --yaml "$yml" --json
  node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
  if (d.groups.length !== 1) process.exit(1);
  if (d.groups[0].prefix !== 'bare') process.exit(2);
  if (d.groups[0].total !== 1) process.exit(3);
" <<< "$output"
}

@test "resolve-qa-labels: JSON requires-extensions label detected in group" {
  yml="$TEST_TEMP_DIR/json-req-ext.yaml"
  cat > "$yml" <<'EOF'
test_cases:
  - id: ext-001
    feature: Ext Feature
    scenario: Needs extensions
    automated: false
    non_automatable_reason: 'Reason'
    labels:
      - requires-extensions
EOF
  run node "$REAL_SCRIPT" --yaml "$yml" --json
  echo "$output" | grep -q '"requires_extensions":true'
}

@test "resolve-qa-labels: JSON automated:true with cursor label NOT extracted to cursorTcs" {
  # cursor extraction only happens when automated !== 'true'
  yml="$TEST_TEMP_DIR/json-cursor-auto.yaml"
  cat > "$yml" <<'EOF'
test_cases:
  - id: cursor-auto-001
    feature: Cursor Auto
    scenario: Auto with cursor label
    automated: true
    labels:
      - cursor
EOF
  run node "$REAL_SCRIPT" --yaml "$yml" --json
  node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
  if (d.cursor_tcs.length !== 0) process.exit(1);  // NOT extracted
  if (d.groups.length !== 0) process.exit(2);      // nonAutomated = 0 → skipped
" <<< "$output"
}

# ════════════════════════════════════════════════════════════════════
# JSON output — cursor / ubuntu extraction
# ════════════════════════════════════════════════════════════════════

@test "resolve-qa-labels: JSON cursor and ubuntu TCs extracted with totals" {
  yml="$TEST_TEMP_DIR/json-cursor-ubuntu.yaml"
  cat > "$yml" <<'EOF'
test_cases:
  - id: group-001
    feature: Group Feature
    scenario: Normal manual
    automated: false
    non_automatable_reason: 'Normal reason'

  - id: group-002
    feature: Group Feature
    scenario: Normal assisted
    automated: assisted

  - id: cursor-001
    feature: Cursor Feature
    scenario: Cursor manual
    automated: false
    non_automatable_reason: 'Needs cursor'
    labels:
      - cursor

  - id: ubuntu-001
    feature: Ubuntu Feature
    scenario: Ubuntu assisted
    automated: assisted
    labels:
      - ubuntu
EOF
  run node "$REAL_SCRIPT" --yaml "$yml" --json
  node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
  // group (prefix 'group') should have 2 non-automated TCs (manual + assisted)
  // cursor-001 goes to cursor_tcs, ubuntu-001 goes to ubuntu_tcs
  if (d.groups.length !== 1) process.exit(1);
  const g = d.groups[0];
  if (g.prefix !== 'group') process.exit(2);
  if (g.assisted !== 1) process.exit(3);
  if (g.manual !== 1) process.exit(4);
  if (g.total !== 2) process.exit(5);

  if (d.cursor_tcs.length !== 1) process.exit(6);
  if (d.cursor_tcs[0].id !== 'cursor-001') process.exit(7);
  if (d.cursor_tcs[0].automated !== false) process.exit(8);

  if (d.ubuntu_tcs.length !== 1) process.exit(9);
  if (d.ubuntu_tcs[0].id !== 'ubuntu-001') process.exit(10);
  if (d.ubuntu_tcs[0].automated !== 'assisted') process.exit(11);

  // Totals include group + cursor + ubuntu
  // group: assisted=1, manual=1
  // cursor: cursor-001 (automated: false → boolean false) → manual +1
  // ubuntu: ubuntu-001 (automated: \"assisted\") → assisted +1
  if (d.total_assisted !== 2) process.exit(12);
  if (d.total_manual !== 2) process.exit(13);
" <<< "$output"
}

@test "resolve-qa-labels: JSON cursor TC with automated:assisted counts as assisted" {
  yml="$TEST_TEMP_DIR/json-cursor-assisted.yaml"
  cat > "$yml" <<'EOF'
test_cases:
  - id: curs-assist-001
    feature: Cursor Assisted
    scenario: Cursor assisted
    automated: assisted
    labels:
      - cursor
EOF
  run node "$REAL_SCRIPT" --yaml "$yml" --json
  node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
  if (d.cursor_tcs.length !== 1) process.exit(1);
  if (d.cursor_tcs[0].automated !== 'assisted') process.exit(2);
  if (d.total_assisted !== 1) process.exit(3);   // cursor assisted → assisted
  if (d.total_manual !== 0) process.exit(4);
" <<< "$output"
}

# ════════════════════════════════════════════════════════════════════
# Filtering
# ════════════════════════════════════════════════════════════════════

setup_filter_yaml() {
  FILTER_YAML="$TEST_TEMP_DIR/filter-fixture.yaml"
  cat > "$FILTER_YAML" <<'EOF'
test_cases:
  - id: alpha-001
    feature: Alpha
    scenario: Auto no labels
    automated: true

  - id: alpha-002
    feature: Alpha
    scenario: Assisted ubuntu
    automated: assisted
    labels:
      - ubuntu

  - id: alpha-003
    feature: Alpha
    scenario: Manual cursor
    automated: false
    non_automatable_reason: 'Reason 1'
    labels:
      - cursor

  - id: beta-001
    feature: Beta
    scenario: Auto cursor
    automated: true
    labels:
      - cursor

  - id: beta-002
    feature: Beta
    scenario: Manual no labels
    automated: false
    non_automatable_reason: 'Reason 2'
EOF
}

@test "resolve-qa-labels: filter --label matches single label" {
  setup_filter_yaml
  run node "$REAL_SCRIPT" --yaml "$FILTER_YAML" --label ubuntu
  [[ "$status" -eq 0 ]]
  [[ "$output" == "alpha-002" ]]
}

@test "resolve-qa-labels: filter --label union across multiple TCs" {
  setup_filter_yaml
  run node "$REAL_SCRIPT" --yaml "$FILTER_YAML" --label cursor
  [[ "$status" -eq 0 ]]
  # alpha-003 and beta-001 both have cursor label
  # Output should be two lines (default lines format):
  echo "$output" | grep -q "alpha-003"
  echo "$output" | grep -q "beta-001"
  # Count lines
  lines=$(echo "$output" | wc -l | tr -d ' ')
  [[ "$lines" -eq 2 ]]
}

@test "resolve-qa-labels: filter multiple --label flags as union" {
  setup_filter_yaml
  run node "$REAL_SCRIPT" --yaml "$FILTER_YAML" --label cursor --label ubuntu
  [[ "$status" -eq 0 ]]
  echo "$output" | grep -q "alpha-002"
  echo "$output" | grep -q "alpha-003"
  echo "$output" | grep -q "beta-001"
  lines=$(echo "$output" | wc -l | tr -d ' ')
  [[ "$lines" -eq 3 ]]
}

@test "resolve-qa-labels: filter --exclude-label" {
  setup_filter_yaml
  run node "$REAL_SCRIPT" --yaml "$FILTER_YAML" --exclude-label cursor
  [[ "$status" -eq 0 ]]
  # Should exclude alpha-003 and beta-001
  echo "$output" | grep -q "alpha-001"
  echo "$output" | grep -q "alpha-002"
  echo "$output" | grep -q "beta-002"
  lines=$(echo "$output" | wc -l | tr -d ' ')
  [[ "$lines" -eq 3 ]]
}

@test "resolve-qa-labels: filter --automated-only" {
  setup_filter_yaml
  run node "$REAL_SCRIPT" --yaml "$FILTER_YAML" --automated-only
  [[ "$status" -eq 0 ]]
  echo "$output" | grep -q "alpha-001"
  echo "$output" | grep -q "beta-001"
  lines=$(echo "$output" | wc -l | tr -d ' ')
  [[ "$lines" -eq 2 ]]
}

@test "resolve-qa-labels: filter --assisted" {
  setup_filter_yaml
  run node "$REAL_SCRIPT" --yaml "$FILTER_YAML" --assisted
  [[ "$status" -eq 0 ]]
  [[ "$output" == "alpha-002" ]]
}

@test "resolve-qa-labels: filter --exclude-assisted" {
  setup_filter_yaml
  run node "$REAL_SCRIPT" --yaml "$FILTER_YAML" --exclude-assisted
  [[ "$status" -eq 0 ]]
  echo "$output" | grep -q "alpha-001"
  echo "$output" | grep -q "alpha-003"
  echo "$output" | grep -q "beta-001"
  echo "$output" | grep -q "beta-002"
  lines=$(echo "$output" | wc -l | tr -d ' ')
  [[ "$lines" -eq 4 ]]
}

@test "resolve-qa-labels: filter --label with --automated-only combined" {
  setup_filter_yaml
  run node "$REAL_SCRIPT" --yaml "$FILTER_YAML" --label cursor --automated-only
  [[ "$status" -eq 0 ]]
  # alpha-003 has cursor but is automated: false → excluded by --automated-only
  # beta-001 has cursor and is automated: true → included
  [[ "$output" == "beta-001" ]]
}

@test "resolve-qa-labels: filter empty results" {
  setup_filter_yaml
  run node "$REAL_SCRIPT" --yaml "$FILTER_YAML" --label nonexistent
  [[ "$status" -eq 0 ]]
  [[ -z "$output" ]]
}

# ════════════════════════════════════════════════════════════════════
# Output format
# ════════════════════════════════════════════════════════════════════

@test "resolve-qa-labels: outputs one ID per line" {
  yml="$TEST_TEMP_DIR/format-lines.yaml"
  cat > "$yml" <<'EOF'
test_cases:
  - id: first-001
    feature: Test
    scenario: First
    automated: true
  - id: second-001
    feature: Test
    scenario: Second
    automated: true
EOF
  run node "$REAL_SCRIPT" --yaml "$yml"
  [[ "$status" -eq 0 ]]
  lines=$(echo "$output" | wc -l | tr -d ' ')
  [[ "$lines" -eq 2 ]]
  first=$(echo "$output" | sed -n '1p')
  second=$(echo "$output" | sed -n '2p')
  [[ "$first" == "first-001" ]]
  [[ "$second" == "second-001" ]]
}
