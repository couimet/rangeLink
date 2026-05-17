#!/usr/bin/env bash

# Shared test helper for bats test suites.
# Source from .bats files via: load test_helper

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

setup() {
  TEST_TEMP_DIR="$(mktemp -d)"
  export TEST_TEMP_DIR
}

teardown() {
  rm -rf "${TEST_TEMP_DIR:?}"
}

# ── PATH-based stub helpers ───────────────────────────────────────────────────

stub_dir() {
  STUB_DIR="$TEST_TEMP_DIR/bin"
  mkdir -p "$STUB_DIR"
  export PATH="$STUB_DIR:$PATH"
}

# Create a stub that records args to a log file and exits with a controlled code.
# Usage: make_stub <name> <exit_code_var> <output_var> [extra_body]
# The stub writes "$@" to TEST_TEMP_DIR/<name>-args and whatever $output_var
# contains to stdout. It exits with the code in $exit_code_var.
make_stub() {
  local name="$1"
  local exit_var="$2"
  local output_var="$3"

  cat > "$STUB_DIR/$name"
  chmod +x "$STUB_DIR/$name"
}

# Quick stub that just exits 0 and does nothing else.
make_passive_stub() {
  local name="$1"
  cat > "$STUB_DIR/$name" <<'ENDOFSTUB'
#!/usr/bin/env bash
exit 0
ENDOFSTUB
  chmod +x "$STUB_DIR/$name"
}
