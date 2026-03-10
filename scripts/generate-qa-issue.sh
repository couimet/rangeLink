#!/usr/bin/env bash
set -euo pipefail

# Usage: bash scripts/generate-qa-issue.sh [--dry-run] <yaml-file>
# Example: bash scripts/generate-qa-issue.sh qa/qa-test-cases-v1.0.0-unreleased-2026-03-09.yaml
#
# Creates one parent GitHub issue + one sub-issue per feature section from a versioned QA YAML file.
# The parent issue body uses GitHub task-list syntax (- [ ] #N) to track section-level progress.
#
# Filename convention: qa-test-cases-<version>-<YYYY-MM-DD>.yaml
# Version and date are derived from the filename — no extra flags needed.
#
# Requires:
#   python3 with PyYAML  — install with: pip3 install pyyaml
#   gh CLI               — authenticated with write access to the repo
#   'qa' label           — must already exist in the repository
#     Create once with: gh label create qa --color '#e4e669' --description 'QA test cycle tracking'

DRY_RUN=false
YAML_FILE=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    -*) echo "Unknown option: $arg" >&2; exit 1 ;;
    *) YAML_FILE="$arg" ;;
  esac
done

if [[ -z "$YAML_FILE" ]]; then
  echo "Usage: bash scripts/generate-qa-issue.sh [--dry-run] <yaml-file>" >&2
  echo "Example: bash scripts/generate-qa-issue.sh qa/qa-test-cases-v1.0.0-unreleased-2026-03-09.yaml" >&2
  exit 1
fi

if [[ ! -f "$YAML_FILE" ]]; then
  echo "Error: YAML file not found: $YAML_FILE" >&2
  exit 1
fi

if ! command -v python3 &>/dev/null; then
  echo "Error: python3 is required but not found on PATH" >&2
  exit 1
fi

if ! python3 -c "import yaml" 2>/dev/null; then
  echo "Error: PyYAML is required. Install with: pip3 install pyyaml" >&2
  exit 1
fi

if [[ "$DRY_RUN" == false ]] && ! command -v gh &>/dev/null; then
  echo "Error: gh CLI is required but not found on PATH" >&2
  exit 1
fi

# Derive version and date from filename.
# Pattern: qa-test-cases-<version>-<YYYY-MM-DD>.yaml
# The date is always the trailing YYYY-MM-DD (10 chars); version is everything before it.
BASENAME=$(basename "$YAML_FILE" .yaml)
REST="${BASENAME#qa-test-cases-}"
DATE="${REST: -10}"
VERSION="${REST:0:${#REST}-11}"

echo "QA issue generator"
echo "  Version : $VERSION"
echo "  Date    : $DATE"
echo "  Source  : $YAML_FILE"
[[ "$DRY_RUN" == true ]] && echo "  Mode    : DRY RUN (no GitHub issues will be created)"
echo ""

# Parse YAML and emit tab-separated rows: feature<TAB>id<TAB>scenario<TAB>platform<TAB>automated
TC_DATA=$(python3 - "$YAML_FILE" <<'PYEOF'
import sys, yaml

with open(sys.argv[1]) as f:
    data = yaml.safe_load(f)

for tc in data.get('test_cases', []):
    feature   = tc.get('feature', 'Uncategorized').replace('\t', ' ')
    tc_id     = tc.get('id', '').replace('\t', ' ')
    scenario  = tc.get('scenario', '').replace('\t', ' ')
    platform  = tc.get('platform', 'all')
    automated = 'automated' if tc.get('automated', False) else 'manual'
    print(f"{feature}\t{tc_id}\t{scenario}\t{platform}\t{automated}")
PYEOF
)

if [[ -z "$TC_DATA" ]]; then
  echo "Error: No test cases found in $YAML_FILE" >&2
  exit 1
fi

# Get unique section names in first-appearance order (awk, no bash 4 needed)
SECTIONS=$(echo "$TC_DATA" | awk -F'\t' '!seen[$1]++ {print $1}')
TOTAL_SECTIONS=$(echo "$SECTIONS" | wc -l | tr -d ' ')
TOTAL_TCS=$(echo "$TC_DATA" | wc -l | tr -d ' ')

echo "Found $TOTAL_TCS test cases across $TOTAL_SECTIONS sections"
echo ""

# Create sub-issues and accumulate their numbers for the parent body
SUB_ISSUE_ENTRIES=""

while IFS= read -r section; do
  COUNT=$(echo "$TC_DATA" | awk -F'\t' -v s="$section" '$1 == s' | wc -l | tr -d ' ')
  CHECKBOXES=$(echo "$TC_DATA" | awk -F'\t' -v s="$section" '$1 == s {printf "- [ ] **%s** — %s `%s`\n", $2, $3, $4}')

  TITLE="[QA ${VERSION} / ${DATE}] ${section}"
  BODY="Test cases for **${section}** — QA cycle ${VERSION} — ${DATE}

Full preconditions and steps: \`${YAML_FILE}\`

${CHECKBOXES}"

  if [[ "$DRY_RUN" == true ]]; then
    echo "DRY-RUN sub-issue: $TITLE ($COUNT TCs)"
    SUB_ISSUE_ENTRIES+="<N>§${section}§${COUNT}"$'\n'
  else
    URL=$(gh issue create --title "$TITLE" --body "$BODY" --label "qa")
    NUMBER=$(basename "$URL")
    echo "Created #${NUMBER}: ${section} ($COUNT TCs)"
    SUB_ISSUE_ENTRIES+="${NUMBER}§${section}§${COUNT}"$'\n'
  fi
done <<< "$SECTIONS"

# Build parent issue body from collected sub-issue entries (§-delimited: number§section§count)
PARENT_CHECKLIST=""
while IFS= read -r entry; do
  [[ -z "$entry" ]] && continue
  NUMBER=$(echo "$entry" | cut -d'§' -f1)
  SECTION_NAME=$(echo "$entry" | cut -d'§' -f2)
  COUNT=$(echo "$entry" | cut -d'§' -f3)
  PARENT_CHECKLIST+="- [ ] #${NUMBER} ${SECTION_NAME} (${COUNT} TCs)"$'\n'
done <<< "$SUB_ISSUE_ENTRIES"

PARENT_TITLE="QA Checklist — ${VERSION} — ${DATE}"
PARENT_BODY="Generated from \`${YAML_FILE}\`.

${PARENT_CHECKLIST}"

echo ""
if [[ "$DRY_RUN" == true ]]; then
  echo "DRY-RUN parent issue: $PARENT_TITLE"
  echo ""
  echo "--- Parent body ---"
  echo "$PARENT_BODY"
  echo "---"
else
  PARENT_URL=$(gh issue create --title "$PARENT_TITLE" --body "$PARENT_BODY" --label "qa")
  echo "Created parent issue: $PARENT_URL"
fi
