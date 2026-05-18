#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/generate-qa-issue.sh [--dry-run] [--local] [yaml-file]
# Example: ./scripts/generate-qa-issue.sh qa/qa-test-cases-v1.1.0.yaml
#          ./scripts/generate-qa-issue.sh --local
#
# Creates a single GitHub issue with checkboxes grouped by TC ID prefix (feature domain).
# CI covers fully automated tests; the issue tracks assisted and manual tests only.
#
# With --local, writes the same structured content to a local markdown file in qa/ instead of
# creating a GitHub issue. Useful for offline QA sessions and comparing runs.
#
# If no yaml-file is provided, auto-discovers the most recent QA YAML in qa/ and
# prompts for confirmation before proceeding.
#
# Filename convention: qa-test-cases-<version>.yaml
# Version is derived from the filename — no extra flags needed.
#
# Requires:
#   node       — resolves QA YAML labels and generates JSON
#   gh CLI     — authenticated with write access to the repo (not needed with --dry-run or --local)

DRY_RUN=false
LOCAL_MODE=false
YAML_FILE=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --local) LOCAL_MODE=true ;;
    --) ;;
    -*) echo "Unknown option: $arg" >&2; exit 1 ;;
    *) YAML_FILE="$arg" ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
QA_DIR="$(dirname "$SCRIPT_DIR")/qa"

if [[ -z "$YAML_FILE" ]]; then
  # Auto-discover: find the most recent QA YAML.
  # Suffix sort fix: unsuffixed files (v1.1.0.yaml) sort AFTER
  # suffixed files (v1.1.0-001.yaml) because '.' > '-' in ASCII.
  # Normalize by appending -000 to unsuffixed names for sorting purposes.
  LATEST=$(
    for f in "$QA_DIR"/qa-test-cases-*.yaml; do
      [[ -e "$f" ]] || continue
      name=$(basename "$f")
      base="${name%.yaml}"
      if [[ "$base" =~ -[0-9]{3}$ ]]; then
        printf '%s\t%s\n' "$base" "$name"
      else
        printf '%s-000\t%s\n' "$base" "$name"
      fi
    done | sort -t$'\t' -k1,1 | tail -1 | cut -f2
  )

  if [[ -z "$LATEST" ]]; then
    echo "Error: no QA YAML files found in $QA_DIR" >&2
    exit 1
  fi

  YAML_FILE="$QA_DIR/$LATEST"
  printf 'Use %s? [Y/n] ' "qa/$LATEST"
  read -r REPLY
  if [[ -n "$REPLY" && ! "$REPLY" =~ ^[Yy]$ ]]; then
    echo "Aborted." >&2
    exit 0
  fi
fi

if [[ ! -f "$YAML_FILE" ]]; then
  echo "Error: YAML file not found: $YAML_FILE" >&2
  exit 1
fi

if [[ "$DRY_RUN" == false && "$LOCAL_MODE" == false ]] && ! command -v gh &>/dev/null; then
  echo "Error: gh CLI is required but not found on PATH" >&2
  exit 1
fi

# Derive version from filename.
# Pattern: qa-test-cases-<version>[-NNN].yaml
BASENAME=$(basename "$YAML_FILE" .yaml)
REST="${BASENAME#qa-test-cases-}"
# Strip optional -NNN suffix to get the version
if [[ "$REST" =~ ^(.*)-[0-9]{3}$ ]]; then
  VERSION="${BASH_REMATCH[1]}"
else
  VERSION="$REST"
fi

echo "QA checklist generator"
echo "  Version : $VERSION"
echo "  Source  : $YAML_FILE"
[[ "$DRY_RUN" == true ]] && echo "  Mode    : DRY RUN (no GitHub issue will be created)"
[[ "$LOCAL_MODE" == true ]] && echo "  Mode    : LOCAL (writing to file, no GitHub issue)"
echo ""

# Parse YAML into JSON: object with groups and special-label TCs.
# Groups TCs by ID prefix (everything before the final -NNN).
# "feature" is the most common feature: value among TCs in the group.
# Only includes groups where at least one TC has automated: assisted or automated: false.
# Special labels (cursor, ubuntu) extract TCs into their own sections.
GROUPS_JSON=$(node "$SCRIPT_DIR/resolve-qa-labels.js" --yaml "$YAML_FILE" --json)

if [[ -z "$GROUPS_JSON" ]]; then
  echo "Error: No test cases found in $YAML_FILE" >&2
  exit 1
fi

TOTAL_GROUPS=$(echo "$GROUPS_JSON" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync(0,'utf8')).groups.length))")
TOTAL_TCS=$(echo "$GROUPS_JSON" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));process.stdout.write(String(d.groups.reduce((s,g)=>s+g.total,0)+d.cursor_tcs.length+d.ubuntu_tcs.length))")

echo "Found $TOTAL_TCS assisted/manual test cases across $TOTAL_GROUPS groups"
echo ""

# Build the issue body
ISSUE_TITLE="QA Checklist — ${VERSION}"
ISSUE_BODY="Generated from \`$(basename "$YAML_FILE")\`.

CI runs fully automated tests (\`test:release:automated\`). The checkboxes below cover assisted and manual tests only.

"

# Collect group checkbox lines
GROUP_CHECKBOXES=""
for i in $(seq 0 $((TOTAL_GROUPS - 1))); do
  PREFIX=$(echo "$GROUPS_JSON" | node -e "process.stdout.write(JSON.parse(require('fs').readFileSync(0,'utf8')).groups[$i].prefix)")
  FEATURE=$(echo "$GROUPS_JSON" | node -e "process.stdout.write(JSON.parse(require('fs').readFileSync(0,'utf8')).groups[$i].feature)")
  ASSISTED=$(echo "$GROUPS_JSON" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync(0,'utf8')).groups[$i].assisted))")
  MANUAL=$(echo "$GROUPS_JSON" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync(0,'utf8')).groups[$i].manual))")
  REQ_EXT=$(echo "$GROUPS_JSON" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync(0,'utf8')).groups[$i].requires_extensions))")

  # Build label: (N assisted, M manual) or just (N assisted) or (M manual)
  LABEL_PARTS=""
  if [[ "$ASSISTED" -gt 0 ]]; then
    LABEL_PARTS="${ASSISTED} assisted"
  fi
  if [[ "$MANUAL" -gt 0 ]]; then
    if [[ -n "$LABEL_PARTS" ]]; then
      LABEL_PARTS="${LABEL_PARTS}, ${MANUAL} manual"
    else
      LABEL_PARTS="${MANUAL} manual"
    fi
  fi

  if [[ "$REQ_EXT" == "true" ]]; then
    GROUP_CHECKBOXES+="- [ ] **${FEATURE}** (${LABEL_PARTS}) — \`pnpm test:release:with-extensions --grep \"${PREFIX}\"\`"$'\n'
  else
    GROUP_CHECKBOXES+="- [ ] **${FEATURE}** (${LABEL_PARTS}) — \`pnpm test:release:grep \"${PREFIX}\"\`"$'\n'
  fi
done

# Cursor section — sub-checkboxes for each cursor-labeled TC
CURSOR_SECTION=$(echo "$GROUPS_JSON" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));const t=d.cursor_tcs;if(!t.length)process.exit(0);const l=['- [ ] **Cursor — IDE-Specific Tests** — \`pnpm package:vscode-extension:withInstall:both && cursor qa/fixtures/workspace\`:'];for(const x of t){const a=x.automated===false?'manual':x.automated;l.push('  - [ ] '+x.id+' ('+a+'): '+x.scenario);}process.stdout.write(l.join('\n'))")
CURSOR_COUNT=$(echo "$GROUPS_JSON" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync(0,'utf8')).cursor_tcs.length))")
if [[ "$CURSOR_COUNT" -gt 0 ]]; then
  GROUP_CHECKBOXES+=$'\n'
  GROUP_CHECKBOXES+="${CURSOR_SECTION}"$'\n'
fi

# Ubuntu section — sub-checkboxes for each ubuntu-labeled TC
UBUNTU_SECTION=$(echo "$GROUPS_JSON" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));const t=d.ubuntu_tcs;if(!t.length)process.exit(0);const l=['- [ ] **Ubuntu — Ctrl+R Keybindings** — \`./scripts/qa-ubuntu-docker.sh\` (Docker):'];for(const x of t){const a=x.automated===false?'manual':x.automated;l.push('  - [ ] '+x.id+' ('+a+'): '+x.scenario);}process.stdout.write(l.join('\n'))")
UBUNTU_COUNT=$(echo "$GROUPS_JSON" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync(0,'utf8')).ubuntu_tcs.length))")
if [[ "$UBUNTU_COUNT" -gt 0 ]]; then
  GROUP_CHECKBOXES+=$'\n'
  GROUP_CHECKBOXES+="${UBUNTU_SECTION}"$'\n'
fi

ISSUE_BODY="${ISSUE_BODY}${GROUP_CHECKBOXES}"

TOTAL_ASSISTED=$(echo "$GROUPS_JSON" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync(0,'utf8')).total_assisted))")
TOTAL_MANUAL=$(echo "$GROUPS_JSON" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync(0,'utf8')).total_manual))")
ISSUE_BODY="${ISSUE_BODY}"$'\n'"**Total: ${TOTAL_ASSISTED} assisted, ${TOTAL_MANUAL} manual**"

# --- Local mode: write to a markdown file ---
if [[ "$LOCAL_MODE" == true ]]; then
  OUTPUT_DIR="$QA_DIR/output"
  mkdir -p "$OUTPUT_DIR"
  TIMESTAMP=$(date -u +"%Y%m%d-%H%M%S")
  LOCAL_FILE="$OUTPUT_DIR/qa-checklist-${VERSION}-${TIMESTAMP}.md"

  TOTAL_ASSISTED=$(echo "$GROUPS_JSON" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync(0,'utf8')).total_assisted))")
  TOTAL_MANUAL=$(echo "$GROUPS_JSON" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync(0,'utf8')).total_manual))")

  {
    echo "# QA Checklist — ${VERSION}"
    echo ""
    echo "Generated from \`$(basename "$YAML_FILE")\` on $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
    echo ""
    echo "CI runs fully automated tests (\`test:release:automated\`). The checkboxes below cover assisted and manual tests only."
    echo ""
    echo "${GROUP_CHECKBOXES}"
    echo ""
    echo "**Total: ${TOTAL_ASSISTED} assisted, ${TOTAL_MANUAL} manual**"

  } > "$LOCAL_FILE"

  REPO_ROOT="$(git rev-parse --show-toplevel)"
  RELATIVE_PATH="${LOCAL_FILE#"$REPO_ROOT"/}"
  echo "Local checklist: $RELATIVE_PATH"
  exit 0
fi

# --- GitHub mode: create a single issue ---
if [[ "$DRY_RUN" == true ]]; then
  echo "DRY-RUN issue: $ISSUE_TITLE"
  echo ""
  echo "--- Body ---"
  echo "$ISSUE_BODY"
  echo "---"
else
  URL=$(gh issue create --title "$ISSUE_TITLE" --body "$ISSUE_BODY")
  echo "Created: $URL"
fi
