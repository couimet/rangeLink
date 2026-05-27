#!/usr/bin/env bats

load test_helper

REAL_SCRIPT="$PROJECT_ROOT/packages/rangelink-vscode-extension/scripts/generate-publishing-instructions.sh"

setup_fixture() {
  FIXTURE_ROOT="$TEST_TEMP_DIR"
  mkdir -p "$FIXTURE_ROOT/scripts"
  mkdir -p "$FIXTURE_ROOT/src"

  cp "$REAL_SCRIPT" "$FIXTURE_ROOT/scripts/generate-publishing-instructions.sh"
  SCRIPT="$FIXTURE_ROOT/scripts/generate-publishing-instructions.sh"

  cat > "$FIXTURE_ROOT/package.json" <<'EOF'
{
  "version": "2.0.0",
  "publisher": "test-publisher"
}
EOF

  cat > "$FIXTURE_ROOT/src/version.json" <<'EOF'
{"isDirty": false}
EOF

  stub_dir
  make_stub "git" <<'ENDOFSTUB'
case "$*" in
  *rev-parse*) exit 1 ;;
  *) exit 0 ;;
esac
ENDOFSTUB
}

# ── Smoke-test command title ─────────────────────────────────────────────────────

@test "publishing instructions smoke-test step uses Show Version Info" {
  setup_fixture
  run "$SCRIPT" --allow-dirty
  [[ "$status" -eq 0 ]]

  output_file="$FIXTURE_ROOT/publishing-instructions/publish-vscode-extension-v2.0.0.md"
  [[ -f "$output_file" ]]

  run cat "$output_file"
  [[ "$output" =~ "Show Version Info" ]]
  ! [[ "$output" =~ "Show Extension Info" ]]
}
