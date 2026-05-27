#!/usr/bin/env bats

load test_helper

REAL_SCRIPT="$PROJECT_ROOT/packages/rangelink-vscode-extension/scripts/orchestrate-release-lock.sh"

setup_fixture() {
  FIXTURE_ROOT="$TEST_TEMP_DIR"
  mkdir -p "$FIXTURE_ROOT/scripts"
  mkdir -p "$FIXTURE_ROOT/.commit-msgs"

  cp "$REAL_SCRIPT" "$FIXTURE_ROOT/scripts/orchestrate-release-lock.sh"
  SCRIPT="$FIXTURE_ROOT/scripts/orchestrate-release-lock.sh"

  stub_dir
  make_stub "git" <<'ENDOFSTUB'
case "$*" in
  *--show-toplevel*) echo "$FIXTURE_ROOT_FOR_GIT" ;;
  *status*) exit 0 ;;
  *"checkout -b"*) exit 0 ;;
  *"rev-parse --verify"*) exit 1 ;;
  *"branch --show-current"*) echo "main" ;;
  *) exit 0 ;;
esac
ENDOFSTUB
  export FIXTURE_ROOT_FOR_GIT="$FIXTURE_ROOT"

  # Stub lock-version.sh to do nothing.
  cat > "$FIXTURE_ROOT/scripts/lock-version.sh" <<'STUBEOF'
#!/usr/bin/env bash
echo "Locked version $1"
STUBEOF
  chmod +x "$FIXTURE_ROOT/scripts/lock-version.sh"

  # Stub generate-qa-issue.sh to output a fake issue URL.
  cat > "$FIXTURE_ROOT/scripts/generate-qa-issue.sh" <<'STUBEOF'
#!/usr/bin/env bash
echo "Created QA issue: https://github.com/couimet/rangeLink/issues/999"
STUBEOF
  chmod +x "$FIXTURE_ROOT/scripts/generate-qa-issue.sh"
}

# ── Commit message numbering ─────────────────────────────────────────────────────

@test "first run with empty .commit-msgs creates 0001 file" {
  setup_fixture
  run "$SCRIPT" "1.0.0"
  [[ "$status" -eq 0 ]]
  [[ -f "$FIXTURE_ROOT/.commit-msgs/0001-lock-version-v1.0.0.txt" ]]
}

@test "picks next number after existing files" {
  setup_fixture
  touch "$FIXTURE_ROOT/.commit-msgs/0001-old.txt"
  touch "$FIXTURE_ROOT/.commit-msgs/0005-old.txt"
  touch "$FIXTURE_ROOT/.commit-msgs/0010-old.txt"

  run "$SCRIPT" "2.0.0"
  [[ "$status" -eq 0 ]]
  [[ -f "$FIXTURE_ROOT/.commit-msgs/0011-lock-version-v2.0.0.txt" ]]
}
