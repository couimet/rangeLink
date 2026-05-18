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

# Create a stub whose body is provided via stdin (heredoc). Callers must
# supply the full script; the exit_var / output_var args are accepted for
# signature compatibility with older call sites but are not used.
# Usage: make_stub <name> <exit_code_var> <output_var> <<'ENDOFSTUB' ... ENDOFSTUB
make_stub() {
  local name="$1"

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
