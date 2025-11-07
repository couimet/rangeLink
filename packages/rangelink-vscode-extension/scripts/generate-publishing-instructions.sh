#!/usr/bin/env bash

# Generate version-specific publishing instructions for RangeLink VS Code Extension
# This script validates the environment and creates a markdown file with detailed
# copy-paste commands for publishing to marketplaces.
#
# Usage:
#   ./generate-publishing-instructions.sh              # Normal mode
#   ./generate-publishing-instructions.sh --allow-dirty # Skip dirty check (for testing)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse command line arguments
ALLOW_DIRTY=false
for arg in "$@"; do
  if [ "$arg" = "--allow-dirty" ]; then
    ALLOW_DIRTY=true
  fi
done

# Get script directory and package root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
MONOREPO_ROOT="$(cd "$PACKAGE_DIR/../.." && pwd)"

cd "$PACKAGE_DIR"

# Read version from package.json
VERSION=$(node -p "require('./package.json').version")
PUBLISHER=$(node -p "require('./package.json').publisher")

if [ -z "$VERSION" ]; then
  echo -e "${RED}Error: Could not extract version from package.json${NC}" >&2
  exit 1
fi

# Check if version.json exists
VERSION_JSON_PATH="src/version.json"
if [ ! -f "$VERSION_JSON_PATH" ]; then
  echo -e "${RED}Error: version.json not found at $VERSION_JSON_PATH${NC}" >&2
  echo -e "${YELLOW}Run 'pnpm compile' to generate version.json${NC}" >&2
  exit 1
fi

# Check isDirty flag
IS_DIRTY=$(node -p "require('./$VERSION_JSON_PATH').isDirty")

# Check if git tag already exists
GIT_TAG="vscode-extension-v${VERSION}"
TAG_EXISTS=false
if git rev-parse "$GIT_TAG" >/dev/null 2>&1; then
  TAG_EXISTS=true
fi

# Prepare output directory and file early for error handling
OUTPUT_DIR="publishing-instructions"
mkdir -p "$OUTPUT_DIR"
OUTPUT_FILE="$OUTPUT_DIR/publish-vscode-extension-v${VERSION}.md"

# Function to add warning banner if dirty flag was used
add_dirty_warning_banner() {
  if [ "$IS_DIRTY" = "true" ] && [ "$ALLOW_DIRTY" = "true" ]; then
    cat >> "$OUTPUT_FILE" <<'EOF'

---

## ⚠️ WARNING: TESTING MODE

**This file was generated with `--allow-dirty` flag.**

The working tree contains uncommitted changes. These instructions are for **TESTING ONLY**.

**DO NOT publish to production marketplaces from a dirty working tree.**

For production releases:
1. Commit or stash all changes
2. Rebuild with clean working tree: `pnpm package:vscode-extension`
3. Regenerate instructions: `pnpm generate:publish-instructions:vscode-extension`

---
EOF
  fi
}

# Function to generate error markdown
generate_error_markdown() {
  local error_type=$1
  local error_message=$2

  cat > "$OUTPUT_FILE" <<EOF
# ⚠️ Publishing Instructions - ERROR

## ❌ Cannot Generate Publishing Instructions

**Error:** $error_message
EOF

  # Add dirty warning banner if applicable
  add_dirty_warning_banner

  cat >> "$OUTPUT_FILE" <<EOF

### Resolution Steps:

EOF

  if [ "$error_type" = "dirty" ]; then
    cat >> "$OUTPUT_FILE" <<EOF
1. **Commit or stash your changes:**

2. **Rebuild package with clean working tree:**
   \`\`\`bash
   pnpm package:vscode-extension
   \`\`\`

3. **Regenerate instructions:**
   \`\`\`bash
   pnpm generate:publish-instructions:vscode-extension
   \`\`\`

### Why This Matters

Publishing from a dirty working tree creates unpredictable builds. The version.json
file tracks whether uncommitted changes exist at build time. Always publish from
a clean, tagged commit for reproducibility.
EOF
  elif [ "$error_type" = "tag_exists" ]; then
    cat >> "$OUTPUT_FILE" <<EOF
1. **If this is a mistake, delete the existing tag:**
   \`\`\`bash
   # Delete locally
   git tag -d $GIT_TAG

   # Delete remotely (if pushed)
   git push origin :refs/tags/$GIT_TAG
   \`\`\`

2. **If you need a new version, bump the version number:**
   \`\`\`bash
   # Edit package.json version field
   # Edit CHANGELOG.md with new version section
   git add packages/rangelink-vscode-extension/package.json
   git add packages/rangelink-vscode-extension/CHANGELOG.md
   git commit -m "chore(vscode-ext): bump version to X.Y.Z"
   \`\`\`

3. **Rebuild and regenerate instructions:**
   \`\`\`bash
   pnpm package:vscode-extension
   \`\`\`

### Why This Matters

Each git tag should represent a unique published version. Reusing tags creates
ambiguity about which commit was actually published.
EOF
  elif [ "$error_type" = "changelog" ]; then
    cat >> "$OUTPUT_FILE" <<EOF
1. **Add version section to CHANGELOG.md:**

   \`\`\`markdown
   ## [${VERSION}]

   ### Added
   - New feature 1
   - New feature 2

   ### Fixed
   - Bug fix 1
   \`\`\`

2. **Add reference link at bottom of CHANGELOG.md:**

   \`\`\`markdown
   [${VERSION}]: https://github.com/couimet/rangelink/compare/vscode-extension-vPREV...vscode-extension-v${VERSION}
   \`\`\`

   Replace \`vPREV\` with the previous version (e.g., v0.2.1).

3. **Commit changes:**

4. **Regenerate instructions:**

   \`\`\`bash
   pnpm generate:publish-instructions:vscode-extension
   \`\`\`

### Why This Matters

The CHANGELOG documents all changes for each release. Marketplace listings and GitHub
releases reference this file. Complete changelogs help users understand what changed
and decide whether to upgrade.
EOF
  elif [ "$error_type" = "vsix_missing" ]; then
    cat >> "$OUTPUT_FILE" <<EOF
1. **Build the VSIX package:**

   \`\`\`bash
   pnpm package:vscode-extension
   \`\`\`

2. **Test the extension locally:**

   \`\`\`bash
   pnpm install-local:vscode-extension:vscode
   \`\`\`

3. **Regenerate publishing instructions:**

   \`\`\`bash
   pnpm generate:publish-instructions:vscode-extension
   \`\`\`
EOF
  fi

  cat >> "$OUTPUT_FILE" <<EOF

---

**Generated:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
EOF
}

# Check if VSIX file exists
VSIX_FILE="rangelink-vscode-extension-${VERSION}.vsix"
if [ ! -f "$VSIX_FILE" ]; then
  echo -e "${RED}Error: VSIX file not found: $VSIX_FILE${NC}" >&2
  echo -e "${YELLOW}Build the VSIX first:${NC}" >&2
  echo -e "  pnpm package:vscode-extension" >&2
  echo -e "" >&2
  echo -e "${YELLOW}Then regenerate instructions:${NC}" >&2
  echo -e "  pnpm generate:publish-instructions:vscode-extension" >&2
  generate_error_markdown "vsix_missing" "VSIX file not found: \`$VSIX_FILE\`"
  echo -e "${BLUE}Error details written to: $OUTPUT_FILE${NC}" >&2
  exit 1
fi

# Check CHANGELOG.md has version section and reference link
CHANGELOG_PATH="CHANGELOG.md"
CHANGELOG_VALID=true
CHANGELOG_ERROR=""

if [ ! -f "$CHANGELOG_PATH" ]; then
  CHANGELOG_VALID=false
  CHANGELOG_ERROR="CHANGELOG.md not found"
else
  # Check version section exists
  # When --allow-dirty is used, tolerate suffixes like "- Unreleased"
  # Otherwise, require exact format
  if [ "$ALLOW_DIRTY" = "true" ]; then
    # Flexible: allow "## [0.3.0]" or "## [0.3.0] - Unreleased"
    if ! grep -q "^## \[${VERSION}\]" "$CHANGELOG_PATH"; then
      CHANGELOG_VALID=false
      CHANGELOG_ERROR="No section found for version [${VERSION}] in CHANGELOG.md (expected: ## [${VERSION}] or ## [${VERSION}] - Unreleased)"
    fi
  else
    # Strict: require exact format "## [0.3.0]"
    if ! grep -q "^## \[${VERSION}\]$" "$CHANGELOG_PATH"; then
      CHANGELOG_VALID=false
      CHANGELOG_ERROR="No section found for version [${VERSION}] in CHANGELOG.md (expected: ## [${VERSION}])"
    fi
  fi

  # Always check reference link exists
  if [ "$CHANGELOG_VALID" = "true" ] && ! grep -q "^\[${VERSION}\]:" "$CHANGELOG_PATH"; then
    CHANGELOG_VALID=false
    CHANGELOG_ERROR="No reference link found for [${VERSION}] at bottom of CHANGELOG.md"
  fi
fi

# Check for errors and generate appropriate output
if [ "$IS_DIRTY" = "true" ] && [ "$ALLOW_DIRTY" = "false" ]; then
  echo -e "${RED}Error: Cannot publish from dirty working tree${NC}" >&2
  echo -e "${YELLOW}version.json shows isDirty: true${NC}" >&2
  generate_error_markdown "dirty" "Working tree is dirty (uncommitted changes detected)"
  echo -e "${BLUE}Error details written to: $OUTPUT_FILE${NC}" >&2
  exit 1
fi

if [ "$IS_DIRTY" = "true" ] && [ "$ALLOW_DIRTY" = "true" ]; then
  echo -e "${YELLOW}⚠️  Warning: Working tree is dirty, but --allow-dirty flag is set${NC}"
  echo -e "${YELLOW}   This is for TESTING ONLY - do not publish to production!${NC}"
fi

if [ "$TAG_EXISTS" = "true" ]; then
  echo -e "${RED}Error: Git tag $GIT_TAG already exists${NC}" >&2
  generate_error_markdown "tag_exists" "Git tag \`$GIT_TAG\` already exists"
  echo -e "${BLUE}Error details written to: $OUTPUT_FILE${NC}" >&2
  exit 1
fi

if [ "$CHANGELOG_VALID" = "false" ]; then
  echo -e "${RED}Error: CHANGELOG.md validation failed${NC}" >&2
  echo -e "${YELLOW}$CHANGELOG_ERROR${NC}" >&2
  generate_error_markdown "changelog" "$CHANGELOG_ERROR"
  echo -e "${BLUE}Error details written to: $OUTPUT_FILE${NC}" >&2
  exit 1
fi

# Generate successful publishing instructions
echo -e "${GREEN}✓ Validation passed - generating publishing instructions${NC}"

VSIX_FILE="rangelink-vscode-extension-${VERSION}.vsix"
MARKETPLACE_URL="https://marketplace.visualstudio.com/items?itemName=${PUBLISHER}.rangelink-vscode-extension"
GITHUB_RELEASE_URL="https://github.com/couimet/rangelink/releases/new?tag=${GIT_TAG}"

# Start generating markdown
cat > "$OUTPUT_FILE" <<EOF
# Publishing Instructions: RangeLink VS Code Extension v${VERSION}

**Generated:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
EOF

# Add warning banner if dirty flag was used
add_dirty_warning_banner

cat >> "$OUTPUT_FILE" <<EOF

This file contains version-specific, copy-paste ready commands for publishing
the RangeLink VS Code extension to marketplaces and creating releases.

---

## ✅ Validated Prerequisites

The following were validated when generating this file:

- ✓ VSIX file exists: \`${VSIX_FILE}\`
- ✓ CHANGELOG.md has version section: \`## [${VERSION}]\`
- ✓ CHANGELOG.md has reference link: \`[${VERSION}]: ...\`
- ✓ Git tag does not exist: \`${GIT_TAG}\`
- ✓ Working tree is clean (or \`--allow-dirty\` used for testing)

---

## Phase 1: Create Git Tag

### Tag the Release

Run from **monorepo root**:

\`\`\`bash
git tag -a ${GIT_TAG} -m "Release vscode-extension v${VERSION}"
\`\`\`

### Push Tag

\`\`\`bash
git push origin ${GIT_TAG}
\`\`\`

### Verify Tag

\`\`\`bash
git tag -l "vscode-extension-v*"
git show ${GIT_TAG} --stat
\`\`\`

---

## Phase 2: Create GitHub Release

### Navigate to GitHub Releases

Open: ${GITHUB_RELEASE_URL}

### Fill Release Form

- **Tag:** \`${GIT_TAG}\` (should auto-populate)
- **Title:** \`VS Code Extension v${VERSION}\`
- **Description:** Copy from \`CHANGELOG.md\` for v${VERSION}
- **Attach file:** \`packages/rangelink-vscode-extension/${VSIX_FILE}\`
- **Pre-release:** Check only if this is alpha/beta/rc

### Publish Release

Click "Publish release"

---

## Phase 3: Publish to VS Code Marketplace

### Ensure Logged In

\`\`\`bash
pnpx vsce login ${PUBLISHER}
\`\`\`

**Note:** If this is your first time, create a Personal Access Token (PAT) at:
https://dev.azure.com/\${YOUR_ORG}/_usersSettings/tokens

### Publish

Run from **monorepo root**:

\`\`\`bash
pnpm publish:vscode-extension:vsix
\`\`\`

### Verify Publication

Wait 5-10 minutes, then check:
- Marketplace URL: ${MARKETPLACE_URL}
- Version number shows \`${VERSION}\`

---

## Phase 4: Publish to Open-VSX Registry

### Login (First Time Setup)

If you haven't already:

1. Create Eclipse account and sign Publisher Agreement:
   https://open-vsx.org/

2. Generate Access Token:
   https://open-vsx.org/user-settings/tokens

3. Create namespace (first time only):
   \`\`\`bash
   pnpx ovsx create-namespace ${PUBLISHER} --pat <YOUR_TOKEN>
   \`\`\`

### Publish to Open-VSX

\`\`\`bash
cd packages/rangelink-vscode-extension
pnpx ovsx publish ${VSIX_FILE} --pat <YOUR_TOKEN>
cd ../..
\`\`\`

**Token reminder:** If session expired, regenerate at https://open-vsx.org/user-settings/tokens

### Verify Publication

Check:
- Open-VSX URL: https://open-vsx.org/extension/${PUBLISHER}/rangelink-vscode-extension
- Version shows \`${VERSION}\`

---

## Phase 5: Post-Publishing Verification

### Check All Locations

- [ ] VS Code Marketplace: ${MARKETPLACE_URL}
- [ ] Open-VSX: https://open-vsx.org/extension/${PUBLISHER}/rangelink-vscode-extension
- [ ] GitHub Release: https://github.com/couimet/rangelink/releases/tag/${GIT_TAG}

All locations should show version \`${VERSION}\`.

---

**Generated by:** \`packages/rangelink-vscode-extension/scripts/generate-publishing-instructions.sh\`
**Date:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
EOF

echo -e "${GREEN}✓ Publishing instructions generated successfully${NC}"
echo -e "${BLUE}File: $OUTPUT_FILE${NC}"
echo -e ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Review the generated instructions"
echo -e "  2. Follow each phase sequentially"
echo -e "  3. Check off items as you complete them"
