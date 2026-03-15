#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/generate-qa-issue.sh [--dry-run] [yaml-file]
# Example: ./scripts/generate-qa-issue.sh qa/qa-test-cases-v1.1.0-2026-03-13.yaml
#
# Creates one parent GitHub issue + one sub-issue per feature section from a versioned QA YAML file.
# The parent issue body uses GitHub task-list syntax (- [ ] #N) to track section-level progress.
#
# If no yaml-file is provided, auto-discovers the most recent QA YAML in qa/ and
# prompts for confirmation before proceeding.
#
# Filename convention: qa-test-cases-<version>-<YYYY-MM-DD>[-NNN].yaml
# Version and date are derived from the filename — no extra flags needed.
#
# Requires:
#   python3 with PyYAML  — install with: pip3 install pyyaml
#   gh CLI               — authenticated with write access to the repo
#   jq                   — for building GraphQL payloads (sub-issue linking)

DRY_RUN=false
YAML_FILE=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --) ;;
    -*) echo "Unknown option: $arg" >&2; exit 1 ;;
    *) YAML_FILE="$arg" ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
QA_DIR="$(dirname "$SCRIPT_DIR")/qa"

if [[ -z "$YAML_FILE" ]]; then
  # Auto-discover: find the most recent QA YAML.
  # Suffix sort fix: unsuffixed files (v1.1.0-2026-03-14.yaml) sort AFTER
  # suffixed files (v1.1.0-2026-03-14-002.yaml) because '.' > '-' in ASCII.
  # Normalize by appending -001 to unsuffixed names for sorting purposes.
  LATEST=$(
    for f in "$QA_DIR"/qa-test-cases-*.yaml; do
      [[ -e "$f" ]] || continue
      name=$(basename "$f")
      base="${name%.yaml}"
      if [[ "$base" =~ -[0-9]{3}$ ]]; then
        printf '%s\t%s\n' "$base" "$name"
      else
        printf '%s-001\t%s\n' "$base" "$name"
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

if [[ "$DRY_RUN" == false ]] && ! command -v jq &>/dev/null; then
  echo "Error: jq is required but not found on PATH" >&2
  exit 1
fi

REPO_ROOT=$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)
REPO_OWNER=$(gh repo view --json owner -q '.owner.login' 2>/dev/null) || true
REPO_NAME=$(gh repo view --json name -q '.name' 2>/dev/null) || true

# Derive version and date from filename.
# Pattern: qa-test-cases-<version>-<YYYY-MM-DD>[-NNN].yaml
BASENAME=$(basename "$YAML_FILE" .yaml)
REST="${BASENAME#qa-test-cases-}"
if [[ "$REST" =~ ^(.*)-([0-9]{4}-[0-9]{2}-[0-9]{2})(-[0-9]+)?$ ]]; then
  VERSION="${BASH_REMATCH[1]}"
  DATE="${BASH_REMATCH[2]}"
else
  echo "Error: cannot parse version and date from filename: $BASENAME" >&2
  exit 1
fi

echo "QA issue generator"
echo "  Version : $VERSION"
echo "  Date    : $DATE"
echo "  Source  : $YAML_FILE"
[[ "$DRY_RUN" == true ]] && echo "  Mode    : DRY RUN (no GitHub issues will be created)"
echo ""

# Parse YAML into JSON: array of {feature, count, body} per section.
# Body includes full TC details (preconditions, steps, expected result) as sub-bullets.
SECTIONS_JSON=$(python3 - "$YAML_FILE" <<'PYEOF'
import sys, json, yaml

with open(sys.argv[1]) as f:
    data = yaml.safe_load(f)

tcs = data.get('test_cases', [])
if not tcs:
    sys.exit(1)

sections = {}
section_order = []
for tc in tcs:
    feature = tc.get('feature', 'Uncategorized')
    if feature not in sections:
        sections[feature] = []
        section_order.append(feature)
    sections[feature].append(tc)

result = []
for feature in section_order:
    tc_list = sections[feature]
    lines = []
    for tc in tc_list:
        tc_id = tc.get('id', '')
        scenario = tc.get('scenario', '')
        auto_tag = ' `automated`' if tc.get('automated', False) else ''
        lines.append(f"- [ ] **{tc_id}** — {scenario}{auto_tag}")

        for pre in tc.get('preconditions', []):
            lines.append(f"  - **Pre:** {pre}")
        for i, step in enumerate(tc.get('steps', []), 1):
            lines.append(f"  - **Step {i}:** {step}")
        expected = tc.get('expected_result', '')
        if expected:
            lines.append(f"  - **Expected:** {expected}")

    result.append({"feature": feature, "count": len(tc_list), "body": '\n'.join(lines)})

json.dump(result, sys.stdout)
PYEOF
)

if [[ -z "$SECTIONS_JSON" ]]; then
  echo "Error: No test cases found in $YAML_FILE" >&2
  exit 1
fi

TOTAL_SECTIONS=$(echo "$SECTIONS_JSON" | jq 'length')
TOTAL_TCS=$(echo "$SECTIONS_JSON" | jq '[.[].count] | add')

echo "Found $TOTAL_TCS test cases across $TOTAL_SECTIONS sections"
echo ""

# Create sub-issues and accumulate their numbers for the parent body
SUB_ISSUE_ENTRIES=""

for i in $(seq 0 $((TOTAL_SECTIONS - 1))); do
  section=$(echo "$SECTIONS_JSON" | jq -r ".[$i].feature")
  COUNT=$(echo "$SECTIONS_JSON" | jq -r ".[$i].count")
  CHECKBOXES=$(echo "$SECTIONS_JSON" | jq -r ".[$i].body")

  TITLE="[QA ${VERSION} / ${DATE}] ${section}"
  BODY="Test cases for **${section}** — QA cycle ${VERSION} — ${DATE}

${CHECKBOXES}"

  if [[ "$DRY_RUN" == true ]]; then
    echo "DRY-RUN sub-issue: $TITLE ($COUNT TCs)"
    SUB_ISSUE_ENTRIES+="<N>§${section}§${COUNT}"$'\n'
  else
    URL=$(gh issue create --title "$TITLE" --body "$BODY")
    NUMBER=$(basename "$URL")
    echo "Created #${NUMBER}: ${section} ($COUNT TCs)"
    SUB_ISSUE_ENTRIES+="${NUMBER}§${section}§${COUNT}"$'\n'
  fi
done

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
  PARENT_URL=$(gh issue create --title "$PARENT_TITLE" --body "$PARENT_BODY")
  PARENT_NUMBER=$(basename "$PARENT_URL")
  echo "Created parent issue: $PARENT_URL"

  echo ""
  echo "Linking sub-issues to parent #${PARENT_NUMBER}..."

  link_sub_issue() {
    local parent_num="$1" child_num="$2"
    local nodes_payload mutation_payload

    nodes_payload="$(mktemp "${TMPDIR:-/tmp}/qa-link.nodes.XXXXXX.json")"
    mutation_payload="$(mktemp "${TMPDIR:-/tmp}/qa-link.mutation.XXXXXX.json")"

    jq -n \
      --arg owner "$REPO_OWNER" \
      --arg repo "$REPO_NAME" \
      --argjson parent "$parent_num" \
      --argjson child "$child_num" \
      '{"query": "query($owner: String!, $repo: String!, $parent: Int!, $child: Int!) { repository(owner: $owner, name: $repo) { parent: issue(number: $parent) { id } child: issue(number: $child) { id } } }", "variables": {"owner": $owner, "repo": $repo, "parent": $parent, "child": $child}}' \
      > "$nodes_payload"

    local NODES
    NODES=$(gh api graphql -H 'GraphQL-Features: sub_issues' --input "$nodes_payload" 2>&1) || {
      echo "  Warning: failed to fetch node IDs for #$child_num → #$parent_num: $NODES" >&2
      rm -f "$nodes_payload" "$mutation_payload"
      return 1
    }

    local PARENT_NODE_ID CHILD_NODE_ID
    PARENT_NODE_ID=$(echo "$NODES" | jq -r '.data.repository.parent.id // empty')
    CHILD_NODE_ID=$(echo "$NODES" | jq -r '.data.repository.child.id // empty')

    if [[ -z "$PARENT_NODE_ID" || -z "$CHILD_NODE_ID" ]]; then
      echo "  Warning: could not resolve node IDs for #$child_num → #$parent_num" >&2
      rm -f "$nodes_payload" "$mutation_payload"
      return 1
    fi

    jq -n \
      --arg parentId "$PARENT_NODE_ID" \
      --arg childId "$CHILD_NODE_ID" \
      '{"query": "mutation($parentId: ID!, $childId: ID!) { addSubIssue(input: {issueId: $parentId, subIssueId: $childId}) { issue { number } subIssue { number } } }", "variables": {"parentId": $parentId, "childId": $childId}}' \
      > "$mutation_payload"

    local RESULT
    RESULT=$(gh api graphql -H 'GraphQL-Features: sub_issues' --input "$mutation_payload" 2>&1) || {
      echo "  Warning: addSubIssue failed for #$child_num → #$parent_num: $RESULT" >&2
      rm -f "$nodes_payload" "$mutation_payload"
      return 1
    }

    local ERRORS
    ERRORS=$(echo "$RESULT" | jq -r '.errors[0].message // empty')
    if [[ -n "$ERRORS" ]]; then
      echo "  Warning: addSubIssue error for #$child_num → #$parent_num: $ERRORS" >&2
      rm -f "$nodes_payload" "$mutation_payload"
      return 1
    fi

    rm -f "$nodes_payload" "$mutation_payload"
    echo "  Linked #$child_num → #$parent_num"
  }

  LINK_FAILURES=0
  while IFS= read -r entry; do
    [[ -z "$entry" ]] && continue
    CHILD_NUMBER=$(echo "$entry" | cut -d'§' -f1)
    link_sub_issue "$PARENT_NUMBER" "$CHILD_NUMBER" || LINK_FAILURES=$((LINK_FAILURES + 1))
  done <<< "$SUB_ISSUE_ENTRIES"

  if [[ $LINK_FAILURES -gt 0 ]]; then
    echo ""
    echo "Warning: $LINK_FAILURES sub-issue(s) could not be linked. Link them manually via the GitHub UI."
  fi
fi
