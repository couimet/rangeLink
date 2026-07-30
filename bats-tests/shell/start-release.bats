#!/usr/bin/env bats

load test_helper

REAL_SCRIPT="$PROJECT_ROOT/packages/rangelink-vscode-extension/scripts/start-release.sh"

setup_fixture() {
  FIXTURE_ROOT="$TEST_TEMP_DIR"
  mkdir -p "$FIXTURE_ROOT/scripts"
  mkdir -p "$FIXTURE_ROOT/qa"

  cp "$REAL_SCRIPT" "$FIXTURE_ROOT/scripts/start-release.sh"
  SCRIPT="$FIXTURE_ROOT/scripts/start-release.sh"

  stub_dir
  make_stub "git" <<'ENDOFSTUB'
case "$*" in
  *--show-toplevel*) echo "${FIXTURE_ROOT_FOR_GIT:-$TEST_TEMP_DIR}" ;;
  *) exit 0 ;;
esac
ENDOFSTUB
  export FIXTURE_ROOT_FOR_GIT="$FIXTURE_ROOT"

  make_passive_stub "npx"

  write_package_json() {
    cat > "$FIXTURE_ROOT/package.json"
  }

  write_changelog() {
    cat > "$FIXTURE_ROOT/CHANGELOG.md"
  }

  write_readme() {
    cat > "$FIXTURE_ROOT/README.md"
  }
}

# ── Happy path ──────────────────────────────────────────────────────────────────

@test "adds CHANGELOG header, adds README banner" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "2.0.0"
}
EOF
  cat > "$FIXTURE_ROOT/qa/qa-test-cases.yaml" <<'EOF'
test_cases:
  - id: foo-001
    scenario: 'Test scenario'
    automated: true
EOF
  write_changelog <<'EOF'
# Changelog

## [2.0.0] - 2026-05-26

### Added

- New feature
EOF
  write_readme <<'EOF'
# My Extension

> **Tagline here.**

## Why RangeLink?

Important content.
EOF

  run "$SCRIPT"
  [[ "$status" -eq 0 ]]

  # CHANGELOG: [Unreleased] header prepended before [2.0.0].
  grep -q '^## \[Unreleased\]$' "$FIXTURE_ROOT/CHANGELOG.md"
  grep -q '^## \[2\.0\.0\]' "$FIXTURE_ROOT/CHANGELOG.md"
  # [Unreleased] appears before [2.0.0].
  local unreleased_line version_line
  unreleased_line=$(grep -n '^## \[Unreleased\]$' "$FIXTURE_ROOT/CHANGELOG.md" | cut -d: -f1)
  version_line=$(grep -n '^## \[2\.0\.0\]' "$FIXTURE_ROOT/CHANGELOG.md" | cut -d: -f1)
  [[ "$unreleased_line" -lt "$version_line" ]]

  # README: banner added.
  grep -q '\[!IMPORTANT\]' "$FIXTURE_ROOT/README.md"
  # Banner appears before first ## header.
  local banner_line first_section_line
  banner_line=$(grep -n '\[!IMPORTANT\]' "$FIXTURE_ROOT/README.md" | cut -d: -f1)
  first_section_line=$(grep -n '^## ' "$FIXTURE_ROOT/README.md" | head -1 | cut -d: -f1)
  [[ "$banner_line" -lt "$first_section_line" ]]
}

@test "CHANGELOG: [Unreleased] has empty sections and existing content preserved below" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "2.0.0"
}
EOF
  cat > "$FIXTURE_ROOT/qa/qa-test-cases.yaml" <<'EOF'
test_cases: []
EOF
  write_changelog <<'EOF'
# Changelog

## [2.0.0] - 2026-05-26

### Added

- Existing feature
EOF
  write_readme <<'EOF'
## Why RangeLink?
EOF

  run "$SCRIPT"
  [[ "$status" -eq 0 ]]

  # Empty sections present.
  grep -q '^### Added$' "$FIXTURE_ROOT/CHANGELOG.md"
  grep -q '^### Changed$' "$FIXTURE_ROOT/CHANGELOG.md"
  grep -q '^### Fixed$' "$FIXTURE_ROOT/CHANGELOG.md"

  # Existing content preserved.
  grep -q 'Existing feature' "$FIXTURE_ROOT/CHANGELOG.md"
  grep -q '^## \[2\.0\.0\]' "$FIXTURE_ROOT/CHANGELOG.md"
}

@test "README: banner contains full text and unreleased markers" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "2.0.0"
}
EOF
  cat > "$FIXTURE_ROOT/qa/qa-test-cases.yaml" <<'EOF'
test_cases: []
EOF
  write_changelog <<'EOF'
## [2.0.0] - 2026-05-26
EOF
  write_readme <<'EOF'
## Why RangeLink?
EOF

  run "$SCRIPT"
  [[ "$status" -eq 0 ]]

  # Full banner content.
  grep -q '> \[!IMPORTANT\]' "$FIXTURE_ROOT/README.md"
  grep -q '<sup>Unreleased</sup>' "$FIXTURE_ROOT/README.md"
  grep -q 'VS Code Marketplace' "$FIXTURE_ROOT/README.md"
  grep -q 'Open VSX Registry' "$FIXTURE_ROOT/README.md"
}

# ── Idempotency ─────────────────────────────────────────────────────────────────

@test "re-run prints nothing-to-do message and exits cleanly" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "2.0.0"
}
EOF
  cat > "$FIXTURE_ROOT/qa/qa-test-cases.yaml" <<'EOF'
test_cases: []
EOF
  # Simulate already-started state: CHANGELOG header, README banner.
  write_changelog <<'EOF'
## [Unreleased]

### Added

### Changed

### Fixed

## [2.0.0] - 2026-05-26
EOF
  write_readme <<'EOF'
> [!IMPORTANT]
> Banner content here.

## Why RangeLink?
EOF

  run "$SCRIPT"
  [[ "$status" -eq 0 ]]
  [[ "$output" =~ "Nothing to do" ]]
}

@test "re-run after partial completion picks up remaining steps" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "2.0.0"
}
EOF
  cat > "$FIXTURE_ROOT/qa/qa-test-cases.yaml" <<'EOF'
test_cases:
  - id: foo-001
EOF
  # Partial state: CHANGELOG not updated but README not updated.
  write_changelog <<'EOF'
## [2.0.0] - 2026-05-26
EOF
  write_readme <<'EOF'
## Why RangeLink?
EOF

  run "$SCRIPT"
  [[ "$status" -eq 0 ]]

  # Should have added CHANGELOG header and README banner (the missing steps).
  grep -q '^## \[Unreleased\]$' "$FIXTURE_ROOT/CHANGELOG.md"
  grep -q '\[!IMPORTANT\]' "$FIXTURE_ROOT/README.md"
}

# ── Error paths ─────────────────────────────────────────────────────────────────

@test "missing .version in package.json exits 1" {
  setup_fixture
  write_package_json <<'EOF'
{
}
EOF

  run "$SCRIPT"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "version not set" ]]
}

@test "no qa-test-cases.yaml exits 1" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "2.0.0"
}
EOF
  # No qa-test-cases.yaml written.

  run "$SCRIPT"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "not found" ]]
}
