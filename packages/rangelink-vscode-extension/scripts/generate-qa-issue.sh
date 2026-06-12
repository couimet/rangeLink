#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/generate-qa-issue.sh [--dry-run] [--local]
#
# Creates a single GitHub issue with checkboxes grouped by TC ID prefix (feature domain).
# CI covers fully automated tests; the issue tracks assisted and manual tests only.
#
# With --local, writes the same structured content to a local markdown file in qa/ instead of
# creating a GitHub issue. Useful for offline QA sessions and comparing runs.
#
# Reads qa/qa-test-cases.yaml. Version comes from package.json.
#
# Requires:
#   node       — resolves QA YAML labels and generates JSON
#   jq         — reads .version from package.json
#   gh CLI     — authenticated with write access to the repo (not needed with --dry-run or --local)

DRY_RUN=false
LOCAL_MODE=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --local) LOCAL_MODE=true ;;
    --) ;;
    *) echo "Unknown argument: $arg" >&2; exit 1 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
QA_DIR="$PACKAGE_DIR/qa"
YAML_FILE="$QA_DIR/qa-test-cases.yaml"

if [[ ! -f "$YAML_FILE" ]]; then
  echo "Error: YAML file not found: $YAML_FILE" >&2
  exit 1
fi

if [[ "$DRY_RUN" == false && "$LOCAL_MODE" == false ]] && ! command -v gh &>/dev/null; then
  echo "Error: gh CLI is required but not found on PATH" >&2
  exit 1
fi

VERSION=$(jq -r '.version // empty' "$PACKAGE_DIR/package.json")
if [[ -z "$VERSION" ]]; then
  echo "Error: .version not set in $PACKAGE_DIR/package.json" >&2
  exit 1
fi

echo "QA checklist generator"
echo "  Version : v$VERSION"
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
ISSUE_TITLE="QA Checklist — v${VERSION}"
ISSUE_BODY="Generated from \`$(basename "$YAML_FILE")\`.

CI runs fully automated tests (\`test:release:automated\`). The checkboxes below cover assisted and manual tests only.

"

# Collect group checkbox lines
GROUP_CHECKBOXES=""
CHECKBOX_ASSISTED=0
CHECKBOX_MANUAL=0
for i in $(seq 0 $((TOTAL_GROUPS - 1))); do
  PREFIX=$(echo "$GROUPS_JSON" | node -e "process.stdout.write(JSON.parse(require('fs').readFileSync(0,'utf8')).groups[$i].prefix)")
  FEATURE=$(echo "$GROUPS_JSON" | node -e "process.stdout.write(JSON.parse(require('fs').readFileSync(0,'utf8')).groups[$i].feature)")
  ASSISTED=$(echo "$GROUPS_JSON" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync(0,'utf8')).groups[$i].assisted))")
  MANUAL=$(echo "$GROUPS_JSON" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync(0,'utf8')).groups[$i].manual))")
  REQ_EXT=$(echo "$GROUPS_JSON" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync(0,'utf8')).groups[$i].requires_extensions))")

  CHECKBOX_ASSISTED=$((CHECKBOX_ASSISTED + ASSISTED))
  CHECKBOX_MANUAL=$((CHECKBOX_MANUAL + MANUAL))

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
    GROUP_CHECKBOXES+="- [ ] **${FEATURE}** (${LABEL_PARTS}) — \`pnpm test:release:with-extensions --grep \"${PREFIX}\" --assisted\`"$'\n'
  else
    GROUP_CHECKBOXES+="- [ ] **${FEATURE}** (${LABEL_PARTS}) — \`pnpm test:release:grep \"${PREFIX}\" --assisted\`"$'\n'
  fi
done

# Cursor section — sub-checkboxes for each cursor-labeled TC
CURSOR_SECTION=$(echo "$GROUPS_JSON" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));const t=d.cursor_tcs;if(!t.length)process.exit(0);const l=['- [ ] **Cursor — IDE-Specific Tests** — \`pnpm test:release:cursor\`:'];for(const x of t){const a=x.automated===false?'manual':x.automated;const r=x.nonAutomatableReason?', '+x.nonAutomatableReason:'';l.push('  - [ ] '+x.id+' ('+a+r+'): '+x.scenario);}process.stdout.write(l.join('\n'))")
CURSOR_COUNT=$(echo "$GROUPS_JSON" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync(0,'utf8')).cursor_tcs.length))")
if [[ "$CURSOR_COUNT" -gt 0 ]]; then
  GROUP_CHECKBOXES+=$'\n'
  GROUP_CHECKBOXES+="${CURSOR_SECTION}"$'\n'
fi

# Ubuntu section — sub-checkboxes for each ubuntu-labeled TC
UBUNTU_SECTION=$(echo "$GROUPS_JSON" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));const t=d.ubuntu_tcs;if(!t.length)process.exit(0);const l=['- [ ] **Ubuntu — Ctrl+R Keybindings** — \`pnpm test:release:ubuntu\`:'];for(const x of t){const a=x.automated===false?'manual':x.automated;const r=x.nonAutomatableReason?', '+x.nonAutomatableReason:'';l.push('  - [ ] '+x.id+' ('+a+r+'): '+x.scenario);}process.stdout.write(l.join('\n'))")
UBUNTU_COUNT=$(echo "$GROUPS_JSON" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync(0,'utf8')).ubuntu_tcs.length))")
if [[ "$UBUNTU_COUNT" -gt 0 ]]; then
  GROUP_CHECKBOXES+=$'\n'
  GROUP_CHECKBOXES+="${UBUNTU_SECTION}"$'\n'
fi

TOTAL_ASSISTED=$(echo "$GROUPS_JSON" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync(0,'utf8')).total_assisted))")
TOTAL_MANUAL=$(echo "$GROUPS_JSON" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync(0,'utf8')).total_manual))")

# Add cursor and ubuntu assisted/manual counts to running totals
CURSOR_ASSISTED=$(echo "$GROUPS_JSON" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync(0,'utf8')).cursor_tcs.filter(t=>t.automated==='assisted').length))")
CURSOR_MANUAL=$(echo "$GROUPS_JSON" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync(0,'utf8')).cursor_tcs.filter(t=>t.automated===false).length))")
UBUNTU_ASSISTED=$(echo "$GROUPS_JSON" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync(0,'utf8')).ubuntu_tcs.filter(t=>t.automated==='assisted').length))")
UBUNTU_MANUAL=$(echo "$GROUPS_JSON" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync(0,'utf8')).ubuntu_tcs.filter(t=>t.automated===false).length))")

CHECKBOX_ASSISTED=$((CHECKBOX_ASSISTED + CURSOR_ASSISTED + UBUNTU_ASSISTED))
CHECKBOX_MANUAL=$((CHECKBOX_MANUAL + CURSOR_MANUAL + UBUNTU_MANUAL))

if [[ "$CHECKBOX_ASSISTED" -ne "$TOTAL_ASSISTED" ]]; then
  echo "Error: checkbox assisted count ($CHECKBOX_ASSISTED) does not match YAML assisted count ($TOTAL_ASSISTED)" >&2
  echo "This is a bug in the grouping/filtering logic. Check resolve-qa-labels.js." >&2
  exit 1
fi
if [[ "$CHECKBOX_MANUAL" -ne "$TOTAL_MANUAL" ]]; then
  echo "Error: checkbox manual count ($CHECKBOX_MANUAL) does not match YAML manual count ($TOTAL_MANUAL)" >&2
  echo "This is a bug in the grouping/filtering logic. Check resolve-qa-labels.js." >&2
  exit 1
fi

BODY_FOOTER="${GROUP_CHECKBOXES}"$'\n\n'"**Total: ${TOTAL_ASSISTED} assisted, ${TOTAL_MANUAL} manual**"

ISSUE_BODY="${ISSUE_BODY}${BODY_FOOTER}"

# --- Local mode: write to a markdown file ---
if [[ "$LOCAL_MODE" == true ]]; then
  OUTPUT_DIR="$QA_DIR/output"
  mkdir -p "$OUTPUT_DIR"
  TIMESTAMP=$(date -u +"%Y%m%d-%H%M%S")
  LOCAL_FILE="$OUTPUT_DIR/qa-checklist-v${VERSION}-${TIMESTAMP}.md"

  {
    echo "# QA Checklist — v${VERSION}"
    echo ""
    echo "Generated from \`$(basename "$YAML_FILE")\` on $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
    echo ""
    echo "${ISSUE_BODY}"
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
