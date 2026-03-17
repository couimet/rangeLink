#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/generate-qa-checklist.sh [yaml-file]
#
# Generates a date-stamped QA checklist from a QA test case YAML file.
# Groups TCs by feature area, tags readiness and settings profiles,
# and includes a quick-start section for immediately testable TCs.
#
# Filename: qa-checklist-v<version>-<YYYY-MM-DD>[-NNN].txt
# Same-day reruns append a suffix: -002, -003, etc.
#
# Requires: python3 with PyYAML, jq

if ! command -v python3 &>/dev/null; then
  echo "Error: python3 is required but not found on PATH" >&2
  exit 1
fi

if ! python3 -c "import yaml" 2>/dev/null; then
  echo "Error: PyYAML is required — install with: pip3 install pyyaml" >&2
  echo "  If pip3 fails on system Python, use a venv:" >&2
  echo "  python3 -m venv .venv && source .venv/bin/activate && pip install pyyaml" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(git -C "$PACKAGE_DIR" rev-parse --show-toplevel)"
PACKAGE_JSON="$PACKAGE_DIR/package.json"
QA_DIR="$PACKAGE_DIR/qa"

NEXT_VERSION=$(jq -r '.nextTargetVersion // empty' "$PACKAGE_JSON")
if [[ -z "$NEXT_VERSION" ]]; then
  echo "Error: nextTargetVersion not set in $PACKAGE_JSON" >&2
  exit 1
fi

YAML_FILE="${1:-}"

if [[ -z "$YAML_FILE" ]]; then
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
fi

if [[ ! -f "$YAML_FILE" ]]; then
  echo "Error: file not found: $YAML_FILE" >&2
  exit 1
fi

TODAY=$(date +%Y-%m-%d)
BASE_NAME="qa-checklist-v${NEXT_VERSION}-${TODAY}"
OUTPUT_FILE="$QA_DIR/${BASE_NAME}.txt"

if [[ -f "$OUTPUT_FILE" ]]; then
  MAX_SUFFIX=1
  for existing in "$QA_DIR/${BASE_NAME}"-[0-9][0-9][0-9].txt; do
    [[ -e "$existing" ]] || continue
    suffix="${existing%.txt}"
    suffix="${suffix##*-}"
    num=$((10#$suffix))
    [[ $num -gt $MAX_SUFFIX ]] && MAX_SUFFIX=$num
  done
  NEXT_SUFFIX=$((MAX_SUFFIX + 1))
  OUTPUT_FILE="$QA_DIR/${BASE_NAME}-$(printf '%03d' "$NEXT_SUFFIX").txt"
fi

python3 - "$YAML_FILE" "$OUTPUT_FILE" "$NEXT_VERSION" "$TODAY" <<'PYTHON_SCRIPT'
import sys
import yaml
from collections import OrderedDict

yaml_path = sys.argv[1]
output_path = sys.argv[2]
version = sys.argv[3]
today = sys.argv[4]

with open(yaml_path, 'r') as f:
    data = yaml.safe_load(f)

test_cases = data.get('test_cases', [])

TERMINAL_KEYWORDS = ['terminal', 'bound', 'destination is currently bound', 'destination bound']

SETTINGS_MAP = {
    'clipboard.preserve = "never"': 'clipboard-never',
    'warnOnDirtyBuffer = false': 'no-dirty-warning',
    'delimiter.line': 'custom-delimiters',
    'delimiter.line set to a custom': 'custom-delimiters',
    'maxInline = 2': 'terminal-picker-low',
}

def needs_terminal_setup(tc):
    preconditions = tc.get('preconditions', [])
    for pre in preconditions:
        pre_lower = pre.lower()
        for kw in TERMINAL_KEYWORDS:
            if kw in pre_lower:
                return True
    return False

def get_settings_tag(tc):
    preconditions = tc.get('preconditions', [])
    steps = tc.get('steps', [])
    all_text = ' '.join(preconditions + steps)
    for pattern, profile in SETTINGS_MAP.items():
        if pattern in all_text:
            return profile
    return None

sections = OrderedDict()
for tc in test_cases:
    feature = tc.get('feature', 'Unknown')
    if feature not in sections:
        sections[feature] = []
    sections[feature].append(tc)

ready_now_ids = []
needs_setup_ids = []

for feature, tcs in sections.items():
    for tc in tcs:
        tc_id = tc['id']
        if tc.get('automated', False):
            continue
        if needs_terminal_setup(tc):
            needs_setup_ids.append(tc_id)
        else:
            ready_now_ids.append(tc_id)

lines = []
lines.append(f'RangeLink QA Checklist — v{version} — {today}')
lines.append(f'Source: {yaml_path.split("/qa/")[-1] if "/qa/" in yaml_path else yaml_path}')
lines.append('')
lines.append('=' * 70)
lines.append('')

lines.append('QUICK START — test these immediately (no extra setup needed):')
lines.append('')
chunk_size = 6
for i in range(0, len(ready_now_ids), chunk_size):
    chunk = ready_now_ids[i:i+chunk_size]
    lines.append('  ' + ', '.join(chunk))
lines.append('')
lines.append('Then: open 1+ terminals and R-D bind, then continue with the rest.')
lines.append('')
lines.append('=' * 70)
lines.append('')

for feature, tcs in sections.items():
    tc_count = len(tcs)
    automated_count = sum(1 for tc in tcs if tc.get('automated', False))
    manual_count = tc_count - automated_count

    header = f'{feature} ({tc_count} TCs'
    if automated_count > 0:
        header += f', {automated_count} automated'
    header += ')'

    lines.append(header)
    lines.append('-' * len(header))

    for tc in tcs:
        tc_id = tc['id']
        scenario = tc['scenario']
        tags = []

        if tc.get('automated', False):
            tags.append('automated')

        settings_tag = get_settings_tag(tc)
        if settings_tag:
            tags.append(f'settings: {settings_tag}')

        if needs_terminal_setup(tc):
            tags.append('needs terminal setup')

        tag_str = ''
        if tags:
            tag_str = '  [' + ', '.join(tags) + ']'

        if tc.get('automated', False):
            lines.append(f'  [x] {tc_id} — {scenario}{tag_str}')
        else:
            lines.append(f'  [ ] {tc_id} — {scenario}{tag_str}')

    lines.append('')

lines.append('=' * 70)
lines.append('')
lines.append('SETTINGS PROFILE SWITCHES')
lines.append('')
lines.append('Switch profiles with: ./scripts/qa-smoke-setup.sh --settings <profile>')
lines.append('')
lines.append('  default           — clipboard=always, warnOnDirtyBuffer=true')
lines.append('  clipboard-never   — clipboard=never')
lines.append('  no-dirty-warning  — warnOnDirtyBuffer=false')
lines.append('  custom-delimiters — delimiterLine=@l, delimiterPosition=@c')
lines.append('  terminal-picker-low — terminalPicker.maxInline=2')
lines.append('')

with open(output_path, 'w') as f:
    f.write('\n'.join(lines))

print(f'Generated {output_path.split("/qa/")[-1] if "/qa/" in output_path else output_path}')
PYTHON_SCRIPT

RELATIVE_PATH="${OUTPUT_FILE#"$REPO_ROOT"/}"
echo "Checklist: $RELATIVE_PATH"
