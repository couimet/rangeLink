#!/usr/bin/env bats

load test_helper

REAL_SCRIPT="$PROJECT_ROOT/packages/rangelink-vscode-extension/scripts/generate-qa-issue.sh"

setup_fixture() {
  FIXTURE_ROOT="$TEST_TEMP_DIR"
  mkdir -p "$FIXTURE_ROOT/scripts"
  mkdir -p "$FIXTURE_ROOT/qa"

  # Copy the real script and its dependency.
  cp "$REAL_SCRIPT" "$FIXTURE_ROOT/scripts/generate-qa-issue.sh"
  cp "$PROJECT_ROOT/packages/rangelink-vscode-extension/scripts/resolve-qa-labels.js" \
     "$FIXTURE_ROOT/scripts/resolve-qa-labels.js"

  # Fake package.json so the version lookup works.
  cat > "$FIXTURE_ROOT/package.json" <<'EOF'
{"version": "9.9.9"}
EOF

  stub_dir
  make_stub "jq" <<'ENDOFSTUB'
#!/usr/bin/env bash
echo "9.9.9"
ENDOFSTUB

  make_stub "git" <<'ENDOFSTUB'
#!/usr/bin/env bash
if [[ "$*" == *"--show-toplevel"* ]]; then
  echo "$FIXTURE_ROOT"
fi
ENDOFSTUB

  make_stub "gh" <<'ENDOFSTUB'
#!/usr/bin/env bash
echo "gh $*" >> "$GH_CALL_LOG"
echo "https://github.com/couimet/rangeLink/issues/999"
ENDOFSTUB

  export GH_CALL_LOG="$FIXTURE_ROOT/gh-calls.log"
  : > "$GH_CALL_LOG"

  SCRIPT="$FIXTURE_ROOT/scripts/generate-qa-issue.sh"
}

write_yaml() {
  cat > "$FIXTURE_ROOT/qa/qa-test-cases.yaml"
}

# ── Command format ────────────────────────────────────────────────────────────

@test "commands include --assisted flag" {
  setup_fixture
  write_yaml <<'EOF'
test_cases:
  - id: foo-001
    feature: Foo
    scenario: Assisted test
    automated: assisted
EOF
  run bash -c "cd '$FIXTURE_ROOT' && '$SCRIPT' --local"
  [[ "$status" -eq 0 ]]

  local out
  out=$(ls "$FIXTURE_ROOT/qa/output/qa-checklist-v9.9.9-"*.md)
  grep -q 'pnpm test:release:grep "foo" --assisted' "$out"
}

@test "commands with requires_extensions use with-extensions and --assisted" {
  setup_fixture
  write_yaml <<'EOF'
test_cases:
  - id: ext-001
    feature: Ext
    scenario: Needs extensions
    automated: assisted
    labels:
      - requires-extensions
EOF
  run bash -c "cd '$FIXTURE_ROOT' && '$SCRIPT' --local"
  [[ "$status" -eq 0 ]]

  local out
  out=$(ls "$FIXTURE_ROOT/qa/output/qa-checklist-v9.9.9-"*.md)
  grep -q 'pnpm test:release:with-extensions --grep "ext" --assisted' "$out"
}

@test "automated-only groups are excluded" {
  setup_fixture
  write_yaml <<'EOF'
test_cases:
  - id: auto-001
    feature: Auto
    scenario: Automated test
    automated: true
  - id: assist-001
    feature: Assist
    scenario: Assisted test
    automated: assisted
EOF
  run bash -c "cd '$FIXTURE_ROOT' && '$SCRIPT' --local"
  [[ "$status" -eq 0 ]]

  local out
  out=$(ls "$FIXTURE_ROOT/qa/output/qa-checklist-v9.9.9-"*.md)
  ! grep -q 'Auto' "$out"
  grep -q 'Assist' "$out"
}
