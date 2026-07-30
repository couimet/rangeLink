#!/usr/bin/env bats

load test_helper

REAL_SCRIPT="$PROJECT_ROOT/packages/rangelink-vscode-extension/scripts/check-dirty-tree.sh"

# ── Fixture scaffolding ────────────────────────────────────────────────────────
# The helper calls exit 1 directly. Test it via a bash -c subshell so the
# bats test harness is not killed. The helper and stubs are at known paths.

setup_fixture() {
  FIXTURE_ROOT="$TEST_TEMP_DIR"

  stub_dir

  make_stub "git" <<'ENDOFSTUB'
case "$*" in
  *"status"*)
    case "${GIT_DIRTY_LEVEL:-0}" in
      0) ;;  # clean
      1) echo "?? dirty.txt" ;;
      2)
        if [[ "$*" == *"(exclude)"*"release-testing-instructions-v"* ]]; then
          :  # excluded — no output
        else
          echo "?? packages/rangelink-vscode-extension/qa/release-testing-instructions-v2.0.0.md"
        fi
        ;;
    esac
    exit 0 ;;
esac
ENDOFSTUB

  cp "$REAL_SCRIPT" "$FIXTURE_ROOT/check-dirty-tree.sh"
}

# ── Clean tree ─────────────────────────────────────────────────────────────────

@test "clean tree exits 0 with no stdout output" {
  setup_fixture
  export GIT_DIRTY_LEVEL=0
  run bash -c "source '${FIXTURE_ROOT}/check-dirty-tree.sh'; check_dirty_tree '${FIXTURE_ROOT}'"
  [[ "$status" -eq 0 ]]
  [[ -z "$output" ]]
}

# ── Artifact-only dirty ────────────────────────────────────────────────────────

@test "artifact-only dirty exits 0 with tolerating notice" {
  setup_fixture
  export GIT_DIRTY_LEVEL=2
  run bash -c "source '${FIXTURE_ROOT}/check-dirty-tree.sh'; check_dirty_tree '${FIXTURE_ROOT}'"
  [[ "$status" -eq 0 ]]
  [[ "$output" =~ "tolerating uncommitted" ]]
}

# ── Other file dirty ───────────────────────────────────────────────────────────

@test "other file dirty exits 1 with error and dirty paths" {
  setup_fixture
  export GIT_DIRTY_LEVEL=1
  run bash -c "source '${FIXTURE_ROOT}/check-dirty-tree.sh'; check_dirty_tree '${FIXTURE_ROOT}'"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "working tree is dirty" ]]
  [[ "$output" =~ "dirty.txt" ]]
}

# ── No color variables defined (tests ${RED:-} fallback) ───────────────────────

@test "works without RED/YELLOW/NC color variables" {
  setup_fixture
  export GIT_DIRTY_LEVEL=2
  run bash -c "source '${FIXTURE_ROOT}/check-dirty-tree.sh'; check_dirty_tree '${FIXTURE_ROOT}'"
  [[ "$status" -eq 0 ]]
  [[ "$output" =~ "tolerating uncommitted" ]]
}
