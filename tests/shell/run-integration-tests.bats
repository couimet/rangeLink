#!/usr/bin/env bats

load test_helper

SCRIPT="$PROJECT_ROOT/packages/rangelink-vscode-extension/scripts/run-integration-tests.sh"

setup_mocks() {
  stub_dir

  rm -rf "$PROJECT_ROOT/packages/rangelink-vscode-extension/qa/output"
  mkdir -p "$PROJECT_ROOT/packages/rangelink-vscode-extension/qa/output"

  export STUB_RESOLVED_IDS=""
  export STUB_NODE_EXIT=0
  export STUB_PNPM_EXIT=0
  export STUB_VSCODE_EXIT=0
  export VSCODE_OUTPUT="42 passing (2s)"
  export STUB_QA_EXIT=0
  export STUB_NODE_OUTPUT=""

  # pnpm: handles test:release:prepare (must succeed) and validate:qa-coverage.
  # Records args for later assertions.
  make_stub "pnpm" "PNPM_EXIT" "PNPM_OUTPUT" <<'ENDOFSTUB'
#!/usr/bin/env bash
echo "$@" >> "$TEST_TEMP_DIR/pnpm-args"
if [[ "$1" == "validate:qa-coverage" ]]; then
  echo "QA validation output"
  exit "${STUB_QA_EXIT:-0}"
fi
if [[ "$1" == "test:release:prepare" ]]; then
  exit 0
fi
exit "${STUB_PNPM_EXIT:-0}"
ENDOFSTUB

  # node: handles resolve-qa-labels.js and setup-integration-test-settings.js.
  # Records args for later assertions.
  make_stub "node" "NODE_EXIT" "NODE_OUTPUT" <<'ENDOFSTUB'
#!/usr/bin/env bash
echo "$@" >> "$TEST_TEMP_DIR/node-args"
if [[ "$*" == *"resolve-qa-labels.js"* ]]; then
  if [[ "${STUB_NODE_EXIT:-0}" -ne 0 ]]; then
    echo "resolve-qa-labels error" >&2
    exit "${STUB_NODE_EXIT}"
  fi
  printf '%s' "${STUB_RESOLVED_IDS:-}"
  exit 0
fi
if [[ "$*" == *"setup-integration-test-settings.js"* ]]; then
  echo "$@" >> "$TEST_TEMP_DIR/setup-settings-args"
  exit 0
fi
exit 0
ENDOFSTUB

  # npx vscode-test: the actual test runner. Output goes to stdout (which gets
  # captured to the report file via tee).
  make_stub "npx" "VSCODE_EXIT" "VSCODE_OUTPUT" <<'ENDOFSTUB'
#!/usr/bin/env bash
echo "$@" >> "$TEST_TEMP_DIR/npx-args"
if [[ "$*" == *"vscode-test"* ]]; then
  echo "${VSCODE_OUTPUT:-42 passing (2s)}"
  exit "${STUB_VSCODE_EXIT:-0}"
fi
exit 0
ENDOFSTUB

  # git: returns a stable repo root.
  make_stub "git" "GIT_EXIT" "GIT_OUTPUT" <<'ENDOFSTUB'
#!/usr/bin/env bash
if [[ "$1" == "rev-parse" && "$2" == "--show-toplevel" ]]; then
  echo "$PROJECT_ROOT"
  exit 0
fi
exit 0
ENDOFSTUB
}

# ── Argument parsing ──────────────────────────────────────────────────────────

@test "--help: exits 0 and prints usage" {
  stub_dir
  make_passive_stub "pnpm"
  make_passive_stub "git"
  make_passive_stub "npx"
  make_passive_stub "node"

  run "$SCRIPT" --help
  [ "$status" -eq 0 ]
  [[ "$output" == *"Usage:"* ]]
  [[ "$output" == *"--automated"* ]]
  [[ "$output" == *"--exclude-label"* ]]
  [[ "$output" == *"--exclude-assisted"* ]]
  [[ "$output" == *"--help"* ]]
}

@test "unknown flag: exits 1 with error" {
  stub_dir
  make_passive_stub "pnpm"
  make_passive_stub "git"
  make_passive_stub "npx"
  make_passive_stub "node"

  run "$SCRIPT" --unknown-flag
  [ "$status" -eq 1 ]
  [[ "$output" == *"Unknown option: --unknown-flag"* ]]
}

# ── Missing required arguments ────────────────────────────────────────────────

@test "--grep without value: exits 1 with error" {
  stub_dir
  make_passive_stub "pnpm"
  make_passive_stub "git"

  run "$SCRIPT" --grep
  [ "$status" -eq 1 ]
  [[ "$output" == *"Error: --grep requires a pattern argument"* ]]
}

@test "--grep with next flag as value: exits 1" {
  stub_dir
  make_passive_stub "pnpm"
  make_passive_stub "git"

  run "$SCRIPT" --grep --automated
  [ "$status" -eq 1 ]
  [[ "$output" == *"Error: --grep requires a pattern argument"* ]]
}

@test "--label without value: exits 1 with error" {
  stub_dir
  make_passive_stub "pnpm"
  make_passive_stub "git"

  run "$SCRIPT" --label
  [ "$status" -eq 1 ]
  [[ "$output" == *"Error: --label requires a label name argument"* ]]
}

@test "--exclude-label without value: exits 1 with error" {
  stub_dir
  make_passive_stub "pnpm"
  make_passive_stub "git"

  run "$SCRIPT" --exclude-label
  [ "$status" -eq 1 ]
  [[ "$output" == *"Error: --exclude-label requires a label name argument"* ]]
}

# ── Single flag: MODE and config derivation ───────────────────────────────────

@test "bare invocation: MODE=all, default config, QA validator runs" {
  setup_mocks
  VSCODE_OUTPUT="55 passing (3s)"

  run "$SCRIPT"
  [ "$status" -eq 0 ]

  # Report header
  REPORT=$(find "$PROJECT_ROOT/packages/rangelink-vscode-extension/qa/output" -name "test-run-*-all.txt" | head -1)
  [ -n "$REPORT" ]
  grep -q "Mode:      all" "$REPORT"

  # QA validator was called
  grep -q "validate:qa-coverage" "$TEST_TEMP_DIR/pnpm-args"
}

@test "--automated: MODE=automated, automated config, QA validator runs" {
  setup_mocks
  export STUB_RESOLVED_IDS=$'tc-auto-001\ntc-auto-002\ntc-auto-003'

  run "$SCRIPT" --automated
  [ "$status" -eq 0 ]

  REPORT=$(find "$PROJECT_ROOT/packages/rangelink-vscode-extension/qa/output" -name "test-run-*-automated-grep-*.txt" | head -1)
  [ -n "$REPORT" ]
  grep -q "Mode:      automated" "$REPORT"

  # resolve-qa-labels.js called with --automated-only
  grep -q "resolve-qa-labels.js" "$TEST_TEMP_DIR/node-args"
  grep -q "\-\-automated-only" "$TEST_TEMP_DIR/node-args"

  # QA validator runs (no grep filter active)
  grep -q "validate:qa-coverage" "$TEST_TEMP_DIR/pnpm-args"
}

@test "--with-extensions: MODE=with-extensions, extensions config, calls setup" {
  setup_mocks
  export STUB_RESOLVED_IDS=""

  run "$SCRIPT" --with-extensions
  [ "$status" -eq 0 ]

  REPORT=$(find "$PROJECT_ROOT/packages/rangelink-vscode-extension/qa/output" -name "test-run-*-with-extensions.txt" | head -1)
  [ -n "$REPORT" ]
  grep -q "Mode:      with-extensions" "$REPORT"

  # setup-integration-test-settings.js called
  grep -q "setup-integration-test-settings.js" "$TEST_TEMP_DIR/setup-settings-args"
  grep -q "\-\-suffix" "$TEST_TEMP_DIR/setup-settings-args"
  grep -q "\-with-ext" "$TEST_TEMP_DIR/setup-settings-args"
}

# ── --grep: filtering ─────────────────────────────────────────────────────────

@test "--grep: MODE=grep, grep set, QA validator skipped" {
  setup_mocks
  VSCODE_OUTPUT="3 passing (1s)"

  run "$SCRIPT" --grep "status-bar-menu-002"
  [ "$status" -eq 0 ]

  REPORT=$(find "$PROJECT_ROOT/packages/rangelink-vscode-extension/qa/output" -name "test-run-*-grep-*.txt" | head -1)
  [ -n "$REPORT" ]
  grep -q "Mode:      grep" "$REPORT"
  grep -q "Grep:      status-bar-menu-002" "$REPORT"

  # QA validator skipped
  ! grep -q "validate:qa-coverage" "$TEST_TEMP_DIR/pnpm-args"
}

# ── --label: label resolution ─────────────────────────────────────────────────

@test "--label: resolves IDs, MODE=grep, QA validator skipped" {
  setup_mocks
  export STUB_RESOLVED_IDS=$'clipboard-preservation-001\nclipboard-preservation-002'

  run "$SCRIPT" --label clipboard
  [ "$status" -eq 0 ]

  REPORT=$(find "$PROJECT_ROOT/packages/rangelink-vscode-extension/qa/output" -name "test-run-*-grep-*.txt" | head -1)
  [ -n "$REPORT" ]

  # resolve-qa-labels.js called with --label clipboard
  grep -q "\-\-label" "$TEST_TEMP_DIR/node-args"
  grep -q "clipboard" "$TEST_TEMP_DIR/node-args"

  # QA validator skipped
  ! grep -q "validate:qa-coverage" "$TEST_TEMP_DIR/pnpm-args"
}

@test "--label: zero matches exits 1" {
  setup_mocks
  export STUB_RESOLVED_IDS=""

  run "$SCRIPT" --label nonexistent
  [ "$status" -eq 1 ]
  [[ "$output" == *"filter matched zero tests"* ]]
}

@test "--label: resolve-qa-labels.js failure propagates" {
  setup_mocks
  export STUB_NODE_EXIT=1

  run "$SCRIPT" --label clipboard
  [ "$status" -eq 1 ]
}

@test "repeated --label: passes all to resolve-qa-labels.js" {
  setup_mocks
  export STUB_RESOLVED_IDS=$'clip-001\nnav-001'

  run "$SCRIPT" --label clipboard --label navigation
  [ "$status" -eq 0 ]

  # Both labels passed
  NODE_ARGS=$(cat "$TEST_TEMP_DIR/node-args")
  [[ "$NODE_ARGS" == *"--label"* ]]
  [[ "$NODE_ARGS" == *"clipboard"* ]]
  [[ "$NODE_ARGS" == *"navigation"* ]]
}

# ── --exclude-label ───────────────────────────────────────────────────────────

@test "--exclude-label: passes through to resolve-qa-labels.js" {
  setup_mocks
  export STUB_RESOLVED_IDS=$'tc-001\ntc-002'

  run "$SCRIPT" --exclude-label requires-extensions
  [ "$status" -eq 0 ]

  grep -q "\-\-exclude-label" "$TEST_TEMP_DIR/node-args"
  grep -q "requires-extensions" "$TEST_TEMP_DIR/node-args"
}

@test "repeated --exclude-label: passes all" {
  setup_mocks
  export STUB_RESOLVED_IDS=$'tc-001'

  run "$SCRIPT" --exclude-label slow --exclude-label flaky
  [ "$status" -eq 0 ]

  NODE_ARGS=$(cat "$TEST_TEMP_DIR/node-args")
  [[ "$NODE_ARGS" == *"slow"* ]]
  [[ "$NODE_ARGS" == *"flaky"* ]]
}

# ── --assisted / --exclude-assisted ───────────────────────────────────────────

@test "--assisted: passes --assisted to resolve-qa-labels.js" {
  setup_mocks
  export STUB_RESOLVED_IDS=$'assisted-001\nassisted-002'

  run "$SCRIPT" --assisted
  [ "$status" -eq 0 ]

  grep -q "\-\-assisted" "$TEST_TEMP_DIR/node-args"
}

@test "--exclude-assisted: passes --exclude-assisted to resolve-qa-labels.js" {
  setup_mocks
  export STUB_RESOLVED_IDS=$'auto-001\nauto-002'

  run "$SCRIPT" --exclude-assisted
  [ "$status" -eq 0 ]

  grep -q "\-\-exclude-assisted" "$TEST_TEMP_DIR/node-args"
}

# ── MOCHA_GREP composition ────────────────────────────────────────────────────

@test "--automated: sets MOCHA_GREP to resolved IDs, no MOCHA_INVERT" {
  setup_mocks
  export STUB_RESOLVED_IDS=$'auto-001\nauto-002\nauto-003'

  # Capture the env vars by wrapping the script
  cat > "$STUB_DIR/npx" <<'ENDOFSTUB'
#!/usr/bin/env bash
echo "MOCHA_GREP=${MOCHA_GREP:-<unset>}" >> "$TEST_TEMP_DIR/mocha-env"
echo "MOCHA_INVERT=${MOCHA_INVERT:-<unset>}" >> "$TEST_TEMP_DIR/mocha-env"
echo "42 passing"
exit 0
ENDOFSTUB
  chmod +x "$STUB_DIR/npx"

  run "$SCRIPT" --automated
  [ "$status" -eq 0 ]

  grep -q "MOCHA_GREP=auto-001|auto-002|auto-003" "$TEST_TEMP_DIR/mocha-env"
  grep -q "MOCHA_INVERT=<unset>" "$TEST_TEMP_DIR/mocha-env"
}

@test "--grep + --label: AND-combines via lookahead" {
  setup_mocks
  export STUB_RESOLVED_IDS=$'clip-001\nclip-002'

  cat > "$STUB_DIR/npx" <<'ENDOFSTUB'
#!/usr/bin/env bash
echo "MOCHA_GREP=${MOCHA_GREP:-<unset>}" >> "$TEST_TEMP_DIR/mocha-env"
echo "42 passing"
exit 0
ENDOFSTUB
  chmod +x "$STUB_DIR/npx"

  run "$SCRIPT" --grep "cold-paste" --label clipboard
  [ "$status" -eq 0 ]

  # Lookahead pattern: both conditions must match
  grep -q "MOCHA_GREP=\^(?=.*(clip-001|clip-002))(?=.*(cold-paste))" "$TEST_TEMP_DIR/mocha-env"
}

@test "--grep only: sets MOCHA_GREP to grep pattern" {
  setup_mocks

  cat > "$STUB_DIR/npx" <<'ENDOFSTUB'
#!/usr/bin/env bash
echo "MOCHA_GREP=${MOCHA_GREP:-<unset>}" >> "$TEST_TEMP_DIR/mocha-env"
echo "1 passing"
exit 0
ENDOFSTUB
  chmod +x "$STUB_DIR/npx"

  run "$SCRIPT" --grep "foo"
  [ "$status" -eq 0 ]

  grep -q "MOCHA_GREP=foo" "$TEST_TEMP_DIR/mocha-env"
}

@test "no filter: MOCHA_GREP unset, all tests run" {
  setup_mocks

  cat > "$STUB_DIR/npx" <<'ENDOFSTUB'
#!/usr/bin/env bash
echo "MOCHA_GREP=${MOCHA_GREP:-<unset>}" >> "$TEST_TEMP_DIR/mocha-env"
echo "99 passing"
exit 0
ENDOFSTUB
  chmod +x "$STUB_DIR/npx"

  run "$SCRIPT"
  [ "$status" -eq 0 ]

  grep -q "MOCHA_GREP=<unset>" "$TEST_TEMP_DIR/mocha-env"
}

# ── Report file path generation ───────────────────────────────────────────────

@test "report file: bare invocation creates test-run-*-all.txt" {
  setup_mocks

  run "$SCRIPT"
  [ "$status" -eq 0 ]

  find "$PROJECT_ROOT/packages/rangelink-vscode-extension/qa/output" -name "test-run-*-all.txt" | grep -q .
}

@test "report file: --automated creates test-run-*-automated-grep-*.txt" {
  setup_mocks
  export STUB_RESOLVED_IDS=$'auto-001'

  run "$SCRIPT" --automated
  [ "$status" -eq 0 ]

  find "$PROJECT_ROOT/packages/rangelink-vscode-extension/qa/output" -name "test-run-*-automated-grep-*.txt" | grep -q .
}

@test "report file: --with-extensions creates test-run-*-with-extensions.txt" {
  setup_mocks

  run "$SCRIPT" --with-extensions
  [ "$status" -eq 0 ]

  find "$PROJECT_ROOT/packages/rangelink-vscode-extension/qa/output" -name "test-run-*-with-extensions.txt" | grep -q .
}

@test "report file: --grep creates test-run-*-grep-<slug>.txt" {
  setup_mocks
  VSCODE_OUTPUT="1 passing (1s)"

  run "$SCRIPT" --grep "Foo Bar"
  [ "$status" -eq 0 ]

  find "$PROJECT_ROOT/packages/rangelink-vscode-extension/qa/output" -name "test-run-*-grep-foo-bar.txt" | grep -q .
}

@test "report file: --grep with special chars creates sanitized slug" {
  setup_mocks
  VSCODE_OUTPUT="1 passing (1s)"

  run "$SCRIPT" --grep "Hello! World? Test_[assisted]"
  [ "$status" -eq 0 ]

  find "$PROJECT_ROOT/packages/rangelink-vscode-extension/qa/output" -name "test-run-*-grep-hello-world-test-assisted.txt" | grep -q .
}

@test "report file: --automated --grep creates test-run-*-automated-grep-<slug>.txt" {
  setup_mocks
  export STUB_RESOLVED_IDS=$'auto-001'
  VSCODE_OUTPUT="1 passing (1s)"

  run "$SCRIPT" --automated --grep "foo"
  [ "$status" -eq 0 ]

  find "$PROJECT_ROOT/packages/rangelink-vscode-extension/qa/output" -name "test-run-*-automated-grep-*foo*.txt" | grep -q .
}

# ── Report header content ─────────────────────────────────────────────────────

@test "report header: contains Test Run Report, Generated, Args, Mode" {
  setup_mocks

  run "$SCRIPT"
  [ "$status" -eq 0 ]

  REPORT=$(find "$PROJECT_ROOT/packages/rangelink-vscode-extension/qa/output" -name "test-run-*-all.txt" | head -1)
  grep -q "Test Run Report" "$REPORT"
  grep -q "Generated:" "$REPORT"
  grep -q "UTC" "$REPORT"
  grep -q "Args:" "$REPORT"
  grep -q "Mode:" "$REPORT"
}

@test "report header: shows Grep when filter active" {
  setup_mocks
  VSCODE_OUTPUT="1 passing (1s)"

  run "$SCRIPT" --grep "specific-tc"
  [ "$status" -eq 0 ]

  REPORT=$(find "$PROJECT_ROOT/packages/rangelink-vscode-extension/qa/output" -name "test-run-*-grep-*.txt" | head -1)
  grep -q "Grep:" "$REPORT"
  grep -q "specific-tc" "$REPORT"
}

# ── Exit code computation ─────────────────────────────────────────────────────

@test "exit code: test 0 + QA 0 → final 0" {
  setup_mocks
  STUB_VSCODE_EXIT=0
  STUB_QA_EXIT=0

  run "$SCRIPT"
  [ "$status" -eq 0 ]
}

@test "exit code: test 0 + QA 1 → final 1" {
  setup_mocks
  STUB_VSCODE_EXIT=0
  STUB_QA_EXIT=1

  run "$SCRIPT"
  [ "$status" -eq 1 ]
}

@test "exit code: test 2 + QA 0 → final 2" {
  setup_mocks
  STUB_VSCODE_EXIT=2
  STUB_QA_EXIT=0

  run "$SCRIPT"
  [ "$status" -eq 2 ]
}

@test "exit code: test 2 + QA 1 → final 2 (max)" {
  setup_mocks
  STUB_VSCODE_EXIT=2
  STUB_QA_EXIT=1

  run "$SCRIPT"
  [ "$status" -eq 2 ]
}

# ── QA validation skip logic ──────────────────────────────────────────────────

@test "QA validator: runs for bare invocation" {
  setup_mocks

  run "$SCRIPT"
  [ "$status" -eq 0 ]

  grep -q "validate:qa-coverage" "$TEST_TEMP_DIR/pnpm-args"
}

@test "QA validator: runs for --automated" {
  setup_mocks
  export STUB_RESOLVED_IDS=$'auto-001'

  run "$SCRIPT" --automated
  [ "$status" -eq 0 ]

  grep -q "validate:qa-coverage" "$TEST_TEMP_DIR/pnpm-args"
}

@test "QA validator: runs for --with-extensions" {
  setup_mocks

  run "$SCRIPT" --with-extensions
  [ "$status" -eq 0 ]

  grep -q "validate:qa-coverage" "$TEST_TEMP_DIR/pnpm-args"
}

@test "QA validator: skipped for --grep" {
  setup_mocks
  VSCODE_OUTPUT="1 passing (1s)"

  run "$SCRIPT" --grep "foo"
  [ "$status" -eq 0 ]

  ! grep -q "validate:qa-coverage" "$TEST_TEMP_DIR/pnpm-args"
}

@test "QA validator: skipped for --label" {
  setup_mocks
  export STUB_RESOLVED_IDS=$'tc-001'

  run "$SCRIPT" --label clipboard
  [ "$status" -eq 0 ]

  ! grep -q "validate:qa-coverage" "$TEST_TEMP_DIR/pnpm-args"
}

# ── Zero-test detection ───────────────────────────────────────────────────────

@test "zero-test: --grep with no matching tests exits 1" {
  setup_mocks
  VSCODE_OUTPUT="0 passing (0s)"
  STUB_VSCODE_EXIT=0

  run "$SCRIPT" --grep "nonexistent"
  [ "$status" -eq 1 ]
  [[ "$output" == *"filter matched no tests"* ]]
}

@test "zero-test: --grep with matching tests exits 0" {
  setup_mocks
  VSCODE_OUTPUT="5 passing (2s)"
  STUB_VSCODE_EXIT=0

  run "$SCRIPT" --grep "real-tc"
  [ "$status" -eq 0 ]
}

# ── ANSI stripping ────────────────────────────────────────────────────────────

@test "ANSI stripping: removes escape sequences from report" {
  setup_mocks
  VSCODE_OUTPUT=$'\x1b[32m  \x1b[0m\x1b[90m42 passing\x1b[0m\x1b[90m (2s)\x1b[0m'

  run "$SCRIPT"
  [ "$status" -eq 0 ]

  REPORT=$(find "$PROJECT_ROOT/packages/rangelink-vscode-extension/qa/output" -name "test-run-*-all.txt" | head -1)
  # No ANSI escape chars in report
  ! grep -q $'\x1b' "$REPORT"
  grep -q "42 passing" "$REPORT"
}

# ── Re-run command generation ─────────────────────────────────────────────────

@test "re-run: generated on failure with failed TC IDs" {
  setup_mocks
  STUB_VSCODE_EXIT=1
  # Mocha failure output format the script greps for FAILED_IDS
  VSCODE_OUTPUT="$(printf '  1 passing\n  1 failing\n\n  1) clipboard-preservation-001:\n     Error: something\n\n  2) bind-to-destination-005:\n     Error: other\n')"

  run "$SCRIPT"
  [ "$status" -eq 1 ]

  REPORT=$(find "$PROJECT_ROOT/packages/rangelink-vscode-extension/qa/output" -name "test-run-*-all.txt" | head -1)
  grep -q "Re-run failed tests:" "$REPORT"
  grep -q "bind-to-destination-005|clipboard-preservation-001" "$REPORT"
}

@test "re-run: preserves --automated flag" {
  setup_mocks
  export STUB_RESOLVED_IDS=$'tc-auto-001\ntc-auto-002'
  STUB_VSCODE_EXIT=1
  VSCODE_OUTPUT="$(printf '  1 failing\n\n  1) tc-auto-001:\n     Error: test\n')"

  run "$SCRIPT" --automated
  [ "$status" -eq 1 ]

  REPORT=$(find "$PROJECT_ROOT/packages/rangelink-vscode-extension/qa/output" -name "test-run-*-automated-grep-*.txt" | head -1)
  grep -q "Re-run failed tests:" "$REPORT"
  grep -q "\-\-automated" "$REPORT"
}

@test "re-run: not generated on success" {
  setup_mocks
  STUB_VSCODE_EXIT=0
  VSCODE_OUTPUT="42 passing (2s)"

  run "$SCRIPT"
  [ "$status" -eq 0 ]

  REPORT=$(find "$PROJECT_ROOT/packages/rangelink-vscode-extension/qa/output" -name "test-run-*-all.txt" | head -1)
  # No "Re-run failed tests" block
  ! grep -q "Re-run failed tests:" "$REPORT"
}

# ── --with-extensions: setup integration test settings ─────────────────────────

@test "--with-extensions: does NOT call setup without flag" {
  setup_mocks

  run "$SCRIPT"
  [ "$status" -eq 0 ]

  [ ! -f "$TEST_TEMP_DIR/setup-settings-args" ] || false
}

# ── cd to package root ────────────────────────────────────────────────────────

@test "cd to package root: runs from package directory" {
  setup_mocks

  run "$SCRIPT"
  [ "$status" -eq 0 ]

  # The script cd's to "$SCRIPT_DIR/.." which is the package root.
  # verify that npx vscode-test was invoked (proves script ran)
  grep -q "vscode-test" "$TEST_TEMP_DIR/npx-args"
}

# ── Report header preserves original args (C) ────────────────────────────────

@test "report header: preserves original args after parsing" {
  setup_mocks
  export STUB_RESOLVED_IDS=$'tc-auto-001'

  run "$SCRIPT" --grep "foo" --automated
  [ "$status" -eq 0 ]

  REPORT=$(find "$PROJECT_ROOT/packages/rangelink-vscode-extension/qa/output" -name "test-run-*-automated-grep-*.txt" | head -1)
  grep -q "Args:.*--grep foo --automated" "$REPORT"
}

# ── QA validation skip for exclude/assisted flags alone (D) ───────────────────

@test "QA validator: skipped for --exclude-label alone" {
  setup_mocks
  export STUB_RESOLVED_IDS=$'tc-001\ntc-002'

  run "$SCRIPT" --exclude-label requires-extensions
  [ "$status" -eq 0 ]

  ! grep -q "validate:qa-coverage" "$TEST_TEMP_DIR/pnpm-args"
}

@test "QA validator: skipped for --assisted alone" {
  setup_mocks
  export STUB_RESOLVED_IDS=$'assisted-001'

  run "$SCRIPT" --assisted
  [ "$status" -eq 0 ]

  ! grep -q "validate:qa-coverage" "$TEST_TEMP_DIR/pnpm-args"
}

@test "QA validator: skipped for --exclude-assisted alone" {
  setup_mocks
  export STUB_RESOLVED_IDS=$'auto-001'

  run "$SCRIPT" --exclude-assisted
  [ "$status" -eq 0 ]

  ! grep -q "validate:qa-coverage" "$TEST_TEMP_DIR/pnpm-args"
}
