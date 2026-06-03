#!/usr/bin/env bats

setup() {
  TEST_DIR="$(mktemp -d)"
  BIN_DIR="$TEST_DIR/bin"
  mkdir -p "$BIN_DIR"

  # Export GHA built-in env vars
  export GITHUB_SERVER_URL="https://github.com"
  export GITHUB_REPOSITORY="owner/repo"
  export GITHUB_RUN_ID="12345"

  # Prepend mock bin directory to PATH
  export PATH="$BIN_DIR:$PATH"

  # Create date mock: return a fixed epoch for +%s, delegate to real date otherwise
  cat > "$BIN_DIR/date" <<'SCRIPT'
#!/usr/bin/env bash
if [[ "$1" == "+%s" ]]; then
  echo "1700000100"
else
  exec /bin/date "$@"
fi
SCRIPT
  chmod +x "$BIN_DIR/date"

  # Create jq mock: dispatch by filter pattern, reads stdin for tc_total
  cat > "$BIN_DIR/jq" <<'SCRIPT'
#!/usr/bin/env bash
stdin=$(cat)
if [[ "$1" == "-r" ]]; then
  filter="$2"
else
  filter="$1"
fi
case "$filter" in
  *tc_total*)
    extracted=$(echo "$stdin" | grep -o '"tc_total":[0-9]*' | grep -o '[0-9]*$')
    echo "${extracted:-0}"
    ;;
  *filter_args*)
    echo "$stdin" | grep -o '\[[^]]*\]' | tr -d '[]"' | tr ',' ' ' | head -1
    ;;
  *group_by*)
    echo '[{}]'
    ;;
  length)
    echo "3"
    ;;
  *map*)
    printf '| Link Navigation | 5 | link-navigation-001, link-navigation-002 |\n| Smart Padding | 3 | smart-padding-001, smart-padding-002 |\n'
    ;;
  *)
    echo "0"
    ;;
esac
SCRIPT
  chmod +x "$BIN_DIR/jq"

  # Create node mock: intercept resolve-qa-labels.js calls with --json
  cat > "$BIN_DIR/node" <<'SCRIPT'
#!/usr/bin/env bash
# If MOCK_NODE_FAILURE is set, simulate failure
if [[ -n "$MOCK_NODE_FAILURE" ]]; then
  exit 1
fi
# Handle resolve-qa-labels.js --json calls
if [[ "$*" == *"resolve-qa-labels.js"* && "$*" == *"--json"* ]]; then
  cat <<'JSON'
{"groups":[{"prefix":"link-navigation","feature":"Link Navigation","automated":3,"assisted":1,"manual":1,"total":5,"requires_extensions":false,"ids":["link-navigation-001","link-navigation-002","link-navigation-003","link-navigation-004","link-navigation-005"]},{"prefix":"smart-padding","feature":"Smart Padding","automated":2,"assisted":0,"manual":1,"total":3,"requires_extensions":false,"ids":["smart-padding-001","smart-padding-002","smart-padding-003"]}]}
JSON
  exit 0
fi
# Fall through to real node for any other invocation
exec /usr/bin/env node "$@"
SCRIPT
  chmod +x "$BIN_DIR/node"
}

teardown() {
  rm -rf "$TEST_DIR"
}

# ── Helper ───────────────────────────────────────────────────────────────────

run_script() {
  run bash "$BATS_TEST_DIRNAME/../build-pr-comment.sh" "$@"
}

# ── Required args validation (L120-127) ──────────────────────────────────────

@test "branch 1: missing --title prints error and usage, exits 2" {
  run_script --job-start "1700000040"
  [[ "$status" -eq 2 ]]
  [[ "$output" == *"Error: --title is required"* ]]
  [[ "$output" == *"Usage:"* ]]
}

@test "branch 2: missing --job-start prints error and usage, exits 2" {
  run_script --title "Test Run"
  [[ "$status" -eq 2 ]]
  [[ "$output" == *"Error: --job-start is required"* ]]
  [[ "$output" == *"Usage:"* ]]
}

@test "branches 3, 41, 42: both required args present produces valid output with duration, reproduction command, and feature breakdown" {
  run_script --title "Test Run" --job-start "1700000040"
  [[ "$status" -eq 0 ]]
  [[ "$output" == *"Test Run"* ]]
  [[ "$output" == *"Duration:"* ]]
  [[ "$output" == *"1m 0s"* ]]
  [[ "$output" == *"Reproduce locally:"* ]]
  [[ "$output" == *"pnpm test:release"* ]]
  [[ "$output" == *"<details>"* ]]
  [[ "$output" == *"Feature breakdown"* ]]
  [[ "$output" == *"Link Navigation"* ]]
  [[ "$output" == *"Smart Padding"* ]]
  [[ "$output" == *"View run & artifacts"* ]]
  [[ "$output" == *"https://github.com/owner/repo/actions/runs/12345"* ]]
}

# ── Argument value validation (L36-118) ──────────────────────────────────────

@test "branch 4: flag without value prints error and exits 2" {
  run_script --title --job-start "1700000040"
  [[ "$status" -eq 2 ]]
  [[ "$output" == *"Error: --title requires a value"* ]]
  [[ "$output" == *"Usage:"* ]]
}

@test "branch 5: unknown flag prints usage and exits 2" {
  run_script --unknown --title "Test" --job-start "1700000040"
  [[ "$status" -eq 2 ]]
  [[ "$output" == *"Usage:"* ]]
}

@test "branch 6: positional argument prints unexpected argument error" {
  run_script positional --title "Test" --job-start "1700000040"
  [[ "$status" -eq 2 ]]
  [[ "$output" == *"unexpected argument"* ]]
  [[ "$output" == *"Usage:"* ]]
}

# ── tc_total extraction from report file (L135-139) ──────────────────────────

@test "branch 7: no --report-file keeps TC_TOTAL=0" {
  run_script --title "Test" --job-start "1700000040"
  [[ "$status" -eq 0 ]]
  [[ "$output" == *"QA TC IDs"* ]]
  [[ "$output" == *"0 exercised across 3 features"* ]]
}

@test "branch 8: --report-file pointing to non-existent file keeps TC_TOTAL=0" {
  run_script --title "Test" --job-start "1700000040" --report-file "/nonexistent/path"
  [[ "$status" -eq 0 ]]
  [[ "$output" == *"0 exercised across 3 features"* ]]
}

@test "branch 9: --report-file with RESOLVED_JSON containing tc_total extracts the value" {
  REPORT_FILE="$TEST_DIR/report.txt"
  cat > "$REPORT_FILE" <<'EOF'
some output before
++RESOLVED_JSON_START++
{"tc_total":42}
++RESOLVED_JSON_END++
some output after
EOF
  run_script --title "Test" --job-start "1700000040" --report-file "$REPORT_FILE"
  [[ "$status" -eq 0 ]]
  [[ "$output" == *"42 exercised across 3 features"* ]]
}

@test "branch 10: --report-file with RESOLVED_JSON block missing tc_total defaults to 0" {
  REPORT_FILE="$TEST_DIR/report.txt"
  cat > "$REPORT_FILE" <<'EOF'
++RESOLVED_JSON_START++
{"some_other_key":"value"}
++RESOLVED_JSON_END++
EOF
  run_script --title "Test" --job-start "1700000040" --report-file "$REPORT_FILE"
  [[ "$status" -eq 0 ]]
  [[ "$output" == *"0 exercised across 3 features"* ]]
}

# ── Label filter / filter_args (L141-147) ─────────────────────────────────────

@test "branch 11: no --label-filter shows 0 exercised across N features" {
  run_script --title "Test" --job-start "1700000040"
  [[ "$status" -eq 0 ]]
  [[ "$output" == *"QA TC IDs"* ]]
  [[ "$output" == *"0 exercised across 3 features"* ]]
}

@test "branch 23: no --label-filter omits Ran in Test row" {
  run_script --title "Test" --job-start "1700000040"
  [[ "$status" -eq 0 ]]
  [[ "$output" != *"Ran in Test"* ]]
}

@test "branch 12: filter_args from report RESOLVED_JSON are passed to resolve-qa-labels.js" {
  # Override node mock to capture args
  cat > "$BIN_DIR/node" <<'SCRIPT'
#!/usr/bin/env bash
echo "$*" > "$(dirname "$(dirname "$0")")/node-resolve-args"
cat <<'JSON'
{"groups":[{"prefix":"link-navigation","feature":"Link Navigation","automated":3,"assisted":1,"manual":1,"total":5,"requires_extensions":false,"ids":["link-navigation-001","link-navigation-002","link-navigation-003","link-navigation-004","link-navigation-005"]},{"prefix":"smart-padding","feature":"Smart Padding","automated":2,"assisted":0,"manual":1,"total":3,"requires_extensions":false,"ids":["smart-padding-001","smart-padding-002","smart-padding-003"]}]}
JSON
exit 0
SCRIPT
  chmod +x "$BIN_DIR/node"

  # Create report with filter_args in RESOLVED_JSON
  REPORT_FILE="$TEST_DIR/report.txt"
  cat > "$REPORT_FILE" <<'EOF'
++RESOLVED_JSON_START++
{"tc_total":2,"filter_args":["--automated-only","--exclude-label","requires-extensions"]}
++RESOLVED_JSON_END++
EOF

  run_script --title "Test" --job-start "1700000040" \
    --label-filter "requires-extensions" \
    --report-file "$REPORT_FILE"
  [[ "$status" -eq 0 ]]

  # filter_args from report (not --label-filter) should be forwarded
  [[ "$(cat "$TEST_DIR/node-resolve-args")" == *"--automated-only"* ]]
  [[ "$(cat "$TEST_DIR/node-resolve-args")" == *"--exclude-label"* ]]
  [[ "$(cat "$TEST_DIR/node-resolve-args")" == *"requires-extensions"* ]]
  [[ "$(cat "$TEST_DIR/node-resolve-args")" == *"--json"* ]]

  # --label-filter is NOT passed to resolve-qa-labels.js
  [[ "$(cat "$TEST_DIR/node-resolve-args")" != *"--label-filter"* ]]

  # Verify output still contains feature breakdown
  [[ "$output" == *"2 exercised across 3 features"* ]]
  [[ "$output" == *"Link Navigation"* ]]
}

# ── Pass/fail — unit tests (L152-154) ───────────────────────────────────────

@test "branch 13: --unit-total not set keeps PASS=true" {
  run_script --title "Test" --job-start "1700000040"
  [[ "$status" -eq 0 ]]
  [[ "$output" == *"###"* ]]
  # PASS=true means green check icon (U+2705)
  [[ "$output" == *$'\342\234\205'* ]]
  [[ "$output" != *$'\342\235\214'* ]]
}

@test "branch 14: --unit-total equals --unit-passed keeps PASS=true" {
  run_script --title "Test" --job-start "1700000040" --unit-total "50" --unit-passed "50"
  [[ "$status" -eq 0 ]]
  [[ "$output" == *$'\342\234\205'* ]]
  [[ "$output" == *"50 / 50"* ]]
}

@test "branch 15: --unit-total differs from --unit-passed sets PASS=false" {
  run_script --title "Test" --job-start "1700000040" --unit-total "50" --unit-passed "48"
  [[ "$status" -eq 0 ]]
  [[ "$output" == *$'\342\235\214'* ]]
  [[ "$output" == *"48 / 50"* ]]
}

# ── Pass/fail — integration tests (L155-157) ─────────────────────────────────

@test "branch 16: --int-failed not set keeps PASS=true" {
  run_script --title "Test" --job-start "1700000040"
  [[ "$status" -eq 0 ]]
  [[ "$output" == *$'\342\234\205'* ]]
}

@test "branch 17: --int-failed = 0 keeps PASS=true" {
  run_script --title "Test" --job-start "1700000040" --int-failed "0"
  [[ "$status" -eq 0 ]]
  [[ "$output" == *$'\342\234\205'* ]]
}

@test "branch 18: --int-failed = non-zero sets PASS=false" {
  run_script --title "Test" --job-start "1700000040" --int-failed "3"
  [[ "$status" -eq 0 ]]
  [[ "$output" == *$'\342\235\214'* ]]
}

# ── Unit tests row in output (L164-166) ──────────────────────────────────────

@test "branch 19: --unit-total not set omits unit tests row" {
  run_script --title "Test" --job-start "1700000040"
  [[ "$status" -eq 0 ]]
  [[ "$output" != *"Unit tests:"* ]]
}

@test "branch 20: --unit-total set includes unit tests row" {
  run_script --title "Test" --job-start "1700000040" --unit-total "50" --unit-passed "50"
  [[ "$status" -eq 0 ]]
  [[ "$output" == *"Unit tests:"* ]]
  [[ "$output" == *"50 / 50 passed"* ]]
}

# ── Label-filter row (L168-170) ─────────────────────────────────────────────

@test "branch 21: --label-filter requires-extensions adds Ran in Test row" {
  run_script --title "Test" --job-start "1700000040" --label-filter "requires-extensions"
  [[ "$status" -eq 0 ]]
  [[ "$output" == *"Ran in Test"* ]]
  [[ "$output" == *"Test &amp; Validate"* ]]
}

@test "branch 22: --label-filter set to other value omits Ran in Test row" {
  run_script --title "Test" --job-start "1700000040" --label-filter "needs-override"
  [[ "$status" -eq 0 ]]
  [[ "$output" != *"Ran in Test"* ]]
}

# ── Integration tests row (L172-178) ─────────────────────────────────────────

@test "branch 24: --int-total not set omits integration tests row" {
  run_script --title "Test" --job-start "1700000040"
  [[ "$status" -eq 0 ]]
  [[ "$output" != *"Integration tests"* ]]
}

@test "branch 25: --int-total = 0 omits integration tests row" {
  run_script --title "Test" --job-start "1700000040" --int-total "0"
  [[ "$status" -eq 0 ]]
  [[ "$output" != *"Integration tests"* ]]
}

@test "branch 26: --artifact-url produces direct artifact link instead of Actions run URL" {
  run_script --title "Test" --job-start "1700000040" --artifact-url "https://github.com/owner/repo/actions/runs/99999/artifacts/12345"
  [[ "$status" -eq 0 ]]
  [[ "$output" == *"View report & artifacts"* ]]
  [[ "$output" == *"https://github.com/owner/repo/actions/runs/99999/artifacts/12345"* ]]
  [[ "$output" != *"https://github.com/owner/repo/actions/runs/12345"* ]]
}

@test "branch 27: filter_args in report produce correct reproduction command" {
  REPORT_FILE="$TEST_DIR/report.txt"
  cat > "$REPORT_FILE" <<'EOF'
++RESOLVED_JSON_START++
{"tc_total":5,"filter_args":["--automated-only","--exclude-label","requires-extensions"]}
++RESOLVED_JSON_END++
EOF
  run_script --title "Test" --job-start "1700000040" --report-file "$REPORT_FILE"
  [[ "$status" -eq 0 ]]
  [[ "$output" == *"Reproduce locally:"* ]]
  [[ "$output" == *"./scripts/run-integration-tests.sh --automated-only --exclude-label requires-extensions"* ]]
}

# ── Missing integration report detection (L180-186) ──────────────────────────

@test "branch 28: both --int-passing and --int-failed have values, no missing report row" {
  run_script --title "Test" --job-start "1700000040" --int-passing "5" --int-failed "2"
  [[ "$status" -eq 0 ]]
  [[ "$output" != *"Integration test report missing"* ]]
}

@test "branch 29: both empty, no --report-file, no missing report row" {
  run_script --title "Test" --job-start "1700000040"
  [[ "$status" -eq 0 ]]
  [[ "$output" != *"Integration test report missing"* ]]
}

@test "branch 30: both empty, --report-file missing file produces missing report row and sets PASS=false" {
  run_script --title "Test" --job-start "1700000040" --report-file "/nonexistent/report.txt"
  [[ "$status" -eq 0 ]]
  [[ "$output" == *"Integration test report missing"* ]]
  [[ "$output" == *$'\342\235\214'* ]]
}

@test "branch 31: both empty, --report-file exists without passing/failing lines produces missing report row" {
  REPORT_FILE="$TEST_DIR/report.txt"
  echo "some random output without passing or failing" > "$REPORT_FILE"
  run_script --title "Test" --job-start "1700000040" --report-file "$REPORT_FILE"
  [[ "$status" -eq 0 ]]
  [[ "$output" == *"Integration test report missing"* ]]
  [[ "$output" == *$'\342\235\214'* ]]
}

@test "branch 32: both empty, --report-file exists with passing/failing lines, no missing report row" {
  REPORT_FILE="$TEST_DIR/report.txt"
  echo "  0 passing (1m)" > "$REPORT_FILE"
  run_script --title "Test" --job-start "1700000040" --report-file "$REPORT_FILE"
  [[ "$status" -eq 0 ]]
  [[ "$output" != *"Integration test report missing"* ]]
}

# ── Icon selection (L192-196) ────────────────────────────────────────────────

@test "branch 33: all checks pass produces check mark icon" {
  run_script --title "All Good" --job-start "1700000040"
  [[ "$status" -eq 0 ]]
  [[ "$output" == *"###"*$'\342\234\205'*"All Good"* ]]
}

@test "branch 34: failing check produces cross mark icon" {
  run_script --title "Failing" --job-start "1700000040" --int-failed "1"
  [[ "$status" -eq 0 ]]
  [[ "$output" == *"###"*$'\342\235\214'*"Failing"* ]]
}

# ── Re-run command extraction (L208-220) ─────────────────────────────────────

@test "branch 35: no --report-file, no re-run section" {
  run_script --title "Test" --job-start "1700000040"
  [[ "$status" -eq 0 ]]
  [[ "$output" != *"To re-run"* ]]
  [[ "$output" != *"re-run the full suite"* ]]
}

@test "branch 36: --report-file non-existent, no re-run section" {
  run_script --title "Test" --job-start "1700000040" --report-file "/nonexistent"
  [[ "$status" -eq 0 ]]
  [[ "$output" != *"To re-run"* ]]
  [[ "$output" != *"re-run the full suite"* ]]
}

@test "branch 37: --report-file exists but no Re-run failed tests line, no re-run section" {
  REPORT_FILE="$TEST_DIR/report.txt"
  echo "  Some test output" > "$REPORT_FILE"
  echo "  No re-run command here" >> "$REPORT_FILE"
  run_script --title "Test" --job-start "1700000040" --report-file "$REPORT_FILE"
  [[ "$status" -eq 0 ]]
  [[ "$output" != *"To re-run"* ]]
  [[ "$output" != *"re-run the full suite"* ]]
}

@test "branch 38: report has re-run section, failures <= passing, shows code block" {
  REPORT_FILE="$TEST_DIR/report.txt"
  cat > "$REPORT_FILE" <<'EOF'
++RESOLVED_JSON_START++
{"tc_total":5}
++RESOLVED_JSON_END++
Re-run failed tests:
  pnpm test:release:grep "link-navigation-001|smart-padding-002"
EOF
  run_script --title "Test" --job-start "1700000040" \
    --report-file "$REPORT_FILE" \
    --int-passing "5" --int-failed "2" --int-total "7"
  [[ "$status" -eq 0 ]]
  [[ "$output" == *"To re-run failed tests:"* ]]
  [[ "$output" == *'pnpm test:release:grep "link-navigation-001|smart-padding-002"'* ]]
}

@test "branch 39: report has re-run section, failures > passing, shows full suite message" {
  REPORT_FILE="$TEST_DIR/report.txt"
  cat > "$REPORT_FILE" <<'EOF'
++RESOLVED_JSON_START++
{"tc_total":5}
++RESOLVED_JSON_END++
Re-run failed tests:
  pnpm test:release:grep "link-navigation-001"
EOF
  run_script --title "Test" --job-start "1700000040" \
    --report-file "$REPORT_FILE" \
    --int-passing "2" --int-failed "6" --int-total "8"
  [[ "$status" -eq 0 ]]
  [[ "$output" == *"re-run the full suite"* ]]
  [[ "$output" != *'```'* ]]
}

# ── resolve-qa-labels.js failure (L145) ──────────────────────────────────────

@test "branch 40: node resolve-qa-labels.js failure falls back to empty groups" {
  # Override node mock to simulate failure
  cat > "$BIN_DIR/node" <<'SCRIPT'
#!/usr/bin/env bash
exit 1
SCRIPT
  chmod +x "$BIN_DIR/node"
  # Override jq mock to return 0 for length against the fallback {"groups":[]}
  cat > "$BIN_DIR/jq" <<'SCRIPT'
#!/usr/bin/env bash
stdin=$(cat)
if [[ "$1" == "-r" ]]; then
  filter="$2"
else
  filter="$1"
fi
case "$filter" in
  length)
    if echo "$stdin" | grep -q '^\[\]$'; then
      echo "0"
    else
      echo "3"
    fi
    ;;
  *group_by*)
    echo '[]'
    ;;
  *)
    echo "0"
    ;;
esac
SCRIPT
  chmod +x "$BIN_DIR/jq"
  run_script --title "Test" --job-start "1700000040"
  [[ "$status" -eq 0 ]]
  # Falls back to {"groups":[]}, so 0 features
  [[ "$output" == *"0 exercised across 0 features"* ]]
  # Feature table should be empty (no groups to display)
  # The collapsible section should still exist but with only headers
  [[ "$output" == *"<details>"* ]]
  [[ "$output" == *"Feature breakdown"* ]]
}
