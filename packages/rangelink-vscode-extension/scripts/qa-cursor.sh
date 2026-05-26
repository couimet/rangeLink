#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
MONOREPO_ROOT="$(git -C "$PACKAGE_DIR" rev-parse --show-toplevel)"
GUIDE_FILE="$PACKAGE_DIR/qa/output/cursor-qa-guide.txt"
mkdir -p "$(dirname "$GUIDE_FILE")"

echo ""
echo "============================================="
echo "  Cursor Manual QA"
echo "============================================="
echo ""

# Extract Cursor TCs from the latest QA YAML and write a guide file.
node "$SCRIPT_DIR/resolve-qa-labels.js" --json | node -e "
  const d = JSON.parse(require('fs').readFileSync(0, 'utf8'));
  const tcs = d.cursor_tcs;
  const lines = [];
  lines.push('Cursor QA — TCs to verify');
  lines.push('===========================');
  lines.push('');
  if (!tcs.length) {
    lines.push('No Cursor TCs found in QA YAML.');
  } else {
    for (const tc of tcs) {
      const status = tc.automated === false ? 'manual' : tc.automated;
      const reason = tc.nonAutomatableReason ? ' (' + tc.nonAutomatableReason + ')' : '';
      lines.push('[' + status + reason + '] ' + tc.id);
      lines.push('  ' + tc.scenario);
      lines.push('');
    }
  }
  lines.push('');
  lines.push('Fixture workspace: packages/rangelink-vscode-extension/qa/fixtures/workspace');
  const content = lines.join('\n');
  console.log(content);
  require('fs').writeFileSync('$GUIDE_FILE', content);
"

if [[ ! -s "$GUIDE_FILE" ]]; then
  echo "ERROR: Failed to write guide file: $GUIDE_FILE" >&2
  exit 1
fi

if grep -q "No Cursor TCs found" "$GUIDE_FILE"; then
  echo "No Cursor TCs found — nothing to test."
  exit 0
fi

cd "$MONOREPO_ROOT"
pnpm package:vscode-extension:withInstall:both

cp "$GUIDE_FILE" "$PACKAGE_DIR/qa/fixtures/workspace/cursor-qa-guide.txt"
echo ""
echo "Guide: qa/fixtures/workspace/cursor-qa-guide.txt (also at qa/output/)"
echo ""
echo "Launching Cursor with fixture workspace..."
cursor "packages/rangelink-vscode-extension/qa/fixtures/workspace"
