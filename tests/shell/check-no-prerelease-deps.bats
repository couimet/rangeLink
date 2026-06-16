#!/usr/bin/env bats

load test_helper

REAL_SCRIPT="$PROJECT_ROOT/scripts/check-no-prerelease-deps.sh"

setup_fixture() {
  FIXTURE_ROOT="$TEST_TEMP_DIR"
  cp "$REAL_SCRIPT" "$FIXTURE_ROOT/check-no-prerelease-deps.sh"
  chmod +x "$FIXTURE_ROOT/check-no-prerelease-deps.sh"
}

write_pkg() {
  local path="$1"
  mkdir -p "$(dirname "$path")"
  cat > "$path"
}

# ── Empty directory ────────────────────────────────────────────────────────────

@test "empty directory passes" {
  setup_fixture
  run bash -c "cd '${FIXTURE_ROOT}' && '${FIXTURE_ROOT}/check-no-prerelease-deps.sh'"
  [[ "$status" -eq 0 ]]
}

# ── Clean dependency ───────────────────────────────────────────────────────────

@test "clean dependencies pass" {
  setup_fixture
  write_pkg "$FIXTURE_ROOT/package.json" <<'EOF'
{
  "name": "clean",
  "dependencies": { "foo": "^1.2.3" }
}
EOF
  run bash -c "cd '${FIXTURE_ROOT}' && '${FIXTURE_ROOT}/check-no-prerelease-deps.sh'"
  [[ "$status" -eq 0 ]]
}

# ── Alpha version ──────────────────────────────────────────────────────────────

@test "alpha version fails with file path and dep name" {
  setup_fixture
  write_pkg "$FIXTURE_ROOT/package.json" <<'EOF'
{
  "name": "bad",
  "dependencies": { "foo": "1.0.1-alpha.0" }
}
EOF
  run bash -c "cd '${FIXTURE_ROOT}' && '${FIXTURE_ROOT}/check-no-prerelease-deps.sh'"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "foo" ]]
  [[ "$output" =~ "package.json" ]]
}

# ── Beta version ───────────────────────────────────────────────────────────────

@test "beta version fails" {
  setup_fixture
  write_pkg "$FIXTURE_ROOT/package.json" <<'EOF'
{
  "name": "bad",
  "dependencies": { "foo": "2.0.0-beta.1" }
}
EOF
  run bash -c "cd '${FIXTURE_ROOT}' && '${FIXTURE_ROOT}/check-no-prerelease-deps.sh'"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "2.0.0-beta.1" ]]
}

# ── RC version ─────────────────────────────────────────────────────────────────

@test "rc version fails" {
  setup_fixture
  write_pkg "$FIXTURE_ROOT/package.json" <<'EOF'
{
  "name": "bad",
  "dependencies": { "foo": "3.4.5-rc.2" }
}
EOF
  run bash -c "cd '${FIXTURE_ROOT}' && '${FIXTURE_ROOT}/check-no-prerelease-deps.sh'"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "3.4.5-rc.2" ]]
}

# ── Generic -pre suffix ────────────────────────────────────────────────────────

@test "pre suffix fails" {
  setup_fixture
  write_pkg "$FIXTURE_ROOT/package.json" <<'EOF'
{
  "name": "bad",
  "dependencies": { "foo": "1.2.3-pre.0" }
}
EOF
  run bash -c "cd '${FIXTURE_ROOT}' && '${FIXTURE_ROOT}/check-no-prerelease-deps.sh'"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "1.2.3-pre.0" ]]
}

# ── workspace:* protocol ───────────────────────────────────────────────────────

@test "workspace protocol passes" {
  setup_fixture
  write_pkg "$FIXTURE_ROOT/package.json" <<'EOF'
{
  "name": "ws",
  "dependencies": { "foo": "workspace:*" }
}
EOF
  run bash -c "cd '${FIXTURE_ROOT}' && '${FIXTURE_ROOT}/check-no-prerelease-deps.sh'"
  [[ "$status" -eq 0 ]]
}

# ── file: protocol ─────────────────────────────────────────────────────────────

@test "file protocol passes" {
  setup_fixture
  write_pkg "$FIXTURE_ROOT/package.json" <<'EOF'
{
  "name": "local",
  "dependencies": { "foo": "file:./local" }
}
EOF
  run bash -c "cd '${FIXTURE_ROOT}' && '${FIXTURE_ROOT}/check-no-prerelease-deps.sh'"
  [[ "$status" -eq 0 ]]
}

# ── devDependencies ────────────────────────────────────────────────────────────

@test "alpha in devDependencies fails" {
  setup_fixture
  write_pkg "$FIXTURE_ROOT/package.json" <<'EOF'
{
  "name": "mixed",
  "dependencies": { "foo": "^1.2.3" },
  "devDependencies": { "tooling": "0.1.0-alpha.5" }
}
EOF
  run bash -c "cd '${FIXTURE_ROOT}' && '${FIXTURE_ROOT}/check-no-prerelease-deps.sh'"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "tooling" ]]
}

# ── peerDependencies ───────────────────────────────────────────────────────────

@test "alpha in peerDependencies fails" {
  setup_fixture
  write_pkg "$FIXTURE_ROOT/package.json" <<'EOF'
{
  "name": "peer",
  "peerDependencies": { "react": "19.0.0-alpha.0" }
}
EOF
  run bash -c "cd '${FIXTURE_ROOT}' && '${FIXTURE_ROOT}/check-no-prerelease-deps.sh'"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "react" ]]
}

# ── optionalDependencies ───────────────────────────────────────────────────────

@test "alpha in optionalDependencies fails" {
  setup_fixture
  write_pkg "$FIXTURE_ROOT/package.json" <<'EOF'
{
  "name": "opt",
  "optionalDependencies": { "fsevents": "2.0.0-alpha.1" }
}
EOF
  run bash -c "cd '${FIXTURE_ROOT}' && '${FIXTURE_ROOT}/check-no-prerelease-deps.sh'"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "fsevents" ]]
}

# ── node_modules is excluded from auto-discovery ───────────────────────────────

@test "package.json under node_modules is ignored" {
  setup_fixture
  write_pkg "$FIXTURE_ROOT/node_modules/some-pkg/package.json" <<'EOF'
{
  "name": "vendored",
  "dependencies": { "foo": "1.0.0-alpha.0" }
}
EOF
  run bash -c "cd '${FIXTURE_ROOT}' && '${FIXTURE_ROOT}/check-no-prerelease-deps.sh'"
  [[ "$status" -eq 0 ]]
}

# ── out/ and dist/ are excluded from auto-discovery ────────────────────────────

@test "package.json under out and dist is ignored" {
  setup_fixture
  write_pkg "$FIXTURE_ROOT/out/some-pkg/package.json" <<'EOF'
{
  "name": "built-out",
  "dependencies": { "foo": "1.0.0-alpha.0" }
}
EOF
  write_pkg "$FIXTURE_ROOT/dist/some-pkg/package.json" <<'EOF'
{
  "name": "built-dist",
  "dependencies": { "bar": "1.0.0-beta.0" }
}
EOF
  run bash -c "cd '${FIXTURE_ROOT}' && '${FIXTURE_ROOT}/check-no-prerelease-deps.sh'"
  [[ "$status" -eq 0 ]]
}

# ── .vscode-test and coverage are excluded from auto-discovery ─────────────────

@test "package.json under .vscode-test and coverage is ignored" {
  setup_fixture
  write_pkg "$FIXTURE_ROOT/.vscode-test/vscode-darwin/Visual Studio Code.app/Contents/Resources/app/package.json" <<'EOF'
{
  "name": "vscode-cache",
  "dependencies": { "foo": "0.1.0-alpha.5" }
}
EOF
  write_pkg "$FIXTURE_ROOT/coverage/some-pkg/package.json" <<'EOF'
{
  "name": "cov",
  "dependencies": { "bar": "1.0.0-beta.0" }
}
EOF
  run bash -c "cd '${FIXTURE_ROOT}' && '${FIXTURE_ROOT}/check-no-prerelease-deps.sh'"
  [[ "$status" -eq 0 ]]
}

# ── Multiple offenders reported in one run ─────────────────────────────────────

@test "multiple offenders are all reported" {
  setup_fixture
  write_pkg "$FIXTURE_ROOT/packages/a/package.json" <<'EOF'
{
  "name": "a",
  "dependencies": { "alpha-dep": "1.0.0-alpha.0" }
}
EOF
  write_pkg "$FIXTURE_ROOT/packages/b/package.json" <<'EOF'
{
  "name": "b",
  "dependencies": { "beta-dep": "2.0.0-beta.0" }
}
EOF
  run bash -c "cd '${FIXTURE_ROOT}' && '${FIXTURE_ROOT}/check-no-prerelease-deps.sh'"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "alpha-dep" ]]
  [[ "$output" =~ "beta-dep" ]]
}

# ── Explicit file-path argument restricts the scan ─────────────────────────────

@test "explicit file argument scans only that file" {
  setup_fixture
  write_pkg "$FIXTURE_ROOT/packages/a/package.json" <<'EOF'
{
  "name": "a",
  "dependencies": { "clean-dep": "^1.2.3" }
}
EOF
  write_pkg "$FIXTURE_ROOT/packages/b/package.json" <<'EOF'
{
  "name": "b",
  "dependencies": { "alpha-dep": "1.0.0-alpha.0" }
}
EOF
  run bash -c "cd '${FIXTURE_ROOT}' && '${FIXTURE_ROOT}/check-no-prerelease-deps.sh' '${FIXTURE_ROOT}/packages/a/package.json'"
  [[ "$status" -eq 0 ]]
  [[ ! "$output" =~ "alpha-dep" ]]
}
