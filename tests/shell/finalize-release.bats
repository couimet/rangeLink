#!/usr/bin/env bats

load test_helper

REAL_SCRIPT="$PROJECT_ROOT/packages/rangelink-vscode-extension/scripts/finalize-release.sh"

setup_fixture() {
  FIXTURE_ROOT="$TEST_TEMP_DIR"
  mkdir -p "$FIXTURE_ROOT/scripts"
  mkdir -p "$FIXTURE_ROOT/qa"

  cp "$REAL_SCRIPT" "$FIXTURE_ROOT/scripts/finalize-release.sh"
  SCRIPT="$FIXTURE_ROOT/scripts/finalize-release.sh"

  stub_dir
  make_stub "git" <<'ENDOFSTUB'
case "$*" in
  *--show-toplevel*) echo "${FIXTURE_ROOT_FOR_GIT:-$TEST_TEMP_DIR}" ;;
  *status*) exit 0 ;;
  *) exit 0 ;;
esac
ENDOFSTUB
  export FIXTURE_ROOT_FOR_GIT="$FIXTURE_ROOT"

  make_passive_stub "npx"

  # Stub generate-publishing-instructions.sh to produce a dummy output file.
  cat > "$FIXTURE_ROOT/scripts/generate-publishing-instructions.sh" <<'STUBEOF'
#!/usr/bin/env bash
VERSION=$(jq -r '.version // empty' "$(dirname "$(dirname "${BASH_SOURCE[0]}")")/package.json")
OUTPUT_DIR="$(dirname "$(dirname "${BASH_SOURCE[0]}")")/publishing-instructions"
mkdir -p "$OUTPUT_DIR"
cat > "$OUTPUT_DIR/publish-vscode-extension-v${VERSION}.md" <<'EOF'
# Publishing Instructions: RangeLink VS Code Extension
EOF
STUBEOF
  chmod +x "$FIXTURE_ROOT/scripts/generate-publishing-instructions.sh"

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

@test "finalizes CHANGELOG, strips README markers, removes banner, generates publishing instructions" {
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
  write_changelog <<'EOF'
# Changelog

## [Unreleased]

### Added

- New feature

[Unreleased]: https://github.com/couimet/rangelink/compare/vscode-extension-v1.0.0...HEAD
[1.0.0]: https://github.com/couimet/rangelink/compare/vscode-extension-v0.3.0...vscode-extension-v1.0.0
EOF
  write_readme <<'EOF'
# My Extension

> [!IMPORTANT]
> This has <sup>Unreleased</sup> features.

## Features

- Feature A <sup>Unreleased</sup>
- Feature B <sup>Unreleased</sup>
EOF

  run "$SCRIPT"
  [[ "$status" -eq 0 ]]

  # CHANGELOG: [Unreleased] → [2.0.0].
  [[ ! "$(grep -c '^## \[Unreleased\]$' "$FIXTURE_ROOT/CHANGELOG.md" || true)" -gt 0 ]]
  grep -q '^## \[2.0.0\]$' "$FIXTURE_ROOT/CHANGELOG.md"

  # CHANGELOG: reference links updated.
  grep -q '^\[Unreleased\]: https://github.com/couimet/rangelink/compare/vscode-extension-v2\.0\.0\.\.\.HEAD$' "$FIXTURE_ROOT/CHANGELOG.md"
  grep -q '^\[2\.0\.0\]: https://github.com/couimet/rangelink/compare/vscode-extension-v1\.0\.0\.\.\.vscode-extension-v2\.0\.0$' "$FIXTURE_ROOT/CHANGELOG.md"

  # README: no <sup>Unreleased</sup> markers remain.
  ! grep -q '<sup>Unreleased</sup>' "$FIXTURE_ROOT/README.md"

  # README: [!IMPORTANT] banner removed.
  ! grep -q '\[!IMPORTANT\]' "$FIXTURE_ROOT/README.md"

  # Publishing instructions generated.
  [[ -f "$FIXTURE_ROOT/publishing-instructions/publish-vscode-extension-v2.0.0.md" ]]
}

@test "README preserves non-banner content after stripping" {
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
  write_changelog <<'EOF'
# Changelog

## [Unreleased]

### Added

- New feature

[Unreleased]: https://github.com/couimet/rangelink/compare/vscode-extension-v1.0.0...HEAD
[1.0.0]: https://github.com/couimet/rangelink/compare/vscode-extension-v0.3.0...vscode-extension-v1.0.0
EOF
  write_readme <<'EOF'
# My Extension

> [!IMPORTANT]
> This has <sup>Unreleased</sup> features.

## Why RangeLink?

Important content here.

## Features

- Feature A <sup>Unreleased</sup>
- Feature B
EOF

  run "$SCRIPT"
  [[ "$status" -eq 0 ]]

  # Section headers preserved.
  grep -q '^## Why RangeLink?$' "$FIXTURE_ROOT/README.md"
  grep -q '^## Features$' "$FIXTURE_ROOT/README.md"

  # Non-unreleased content preserved.
  grep -q 'Important content here' "$FIXTURE_ROOT/README.md"
  grep -q 'Feature B' "$FIXTURE_ROOT/README.md"

  # Feature A no longer has the unreleased marker.
  grep -q 'Feature A' "$FIXTURE_ROOT/README.md"
  ! grep -q '<sup>Unreleased</sup>' "$FIXTURE_ROOT/README.md"
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

@test "dirty working tree exits 1" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "2.0.0"
}
EOF
  cat > "$FIXTURE_ROOT/qa/qa-test-cases.yaml" <<'EOF'
test_cases: []
EOF

  # Override git stub to simulate dirty tree.
  cat > "$STUB_DIR/git" <<'ENDOFSTUB'
#!/usr/bin/env bash
case "$*" in
  *--show-toplevel*) echo "${FIXTURE_ROOT_FOR_GIT:-$TEST_TEMP_DIR}" ;;
  *status*) echo "?? untracked-file.txt"; exit 0 ;;
  *) exit 0 ;;
esac
ENDOFSTUB

  run "$SCRIPT"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "dirty" ]]
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

@test "no [Unreleased] in CHANGELOG exits 1" {
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

## [Unreleased]

### Added

- New feature

[Unreleased]: https://github.com/couimet/rangelink/compare/vscode-extension-v1.0.0...HEAD
[1.0.0]: https://github.com/couimet/rangelink/compare/vscode-extension-v0.3.0...vscode-extension-v1.0.0
## [1.0.0]

### Added

- Old feature
EOF
  write_readme <<'EOF'
# My Extension

<sup>Unreleased</sup>
EOF

  run "$SCRIPT"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "Unreleased" ]]
}

@test "no <sup>Unreleased</sup> markers in README exits 1" {
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

## [Unreleased]

### Added

- New feature

[Unreleased]: https://github.com/couimet/rangelink/compare/vscode-extension-v1.0.0...HEAD
[1.0.0]: https://github.com/couimet/rangelink/compare/vscode-extension-v0.3.0...vscode-extension-v1.0.0
## [Unreleased]
EOF
  write_readme <<'EOF'
# My Extension

Clean readme with no markers.
EOF

  run "$SCRIPT"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "no <sup>Unreleased</sup> markers" ]]
}
