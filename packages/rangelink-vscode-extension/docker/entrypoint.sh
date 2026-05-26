#!/usr/bin/env bash
set -euo pipefail

export CI=true

# Generate Ubuntu TC checklist on the desktop
echo "==> Extracting Ubuntu TCs from QA YAML..."

TC_FILE="/root/Desktop/qa-ubuntu-tests.txt"

node /workspace/packages/rangelink-vscode-extension/scripts/resolve-qa-labels.js --json 2>/dev/null | node -e "
  const d = JSON.parse(require('fs').readFileSync(0, 'utf8'));
  const tcs = d.ubuntu_tcs;
  const lines = [];
  lines.push('Ubuntu QA — TCs to verify');
  lines.push('=============================');
  lines.push('');
  lines.push('Copy-paste the commands below into this VS Code terminal.');
  lines.push('');
  if (!tcs.length) {
    lines.push('No Ubuntu-specific TCs found.');
  } else {
    for (const tc of tcs) {
      const status = tc.automated === false ? 'manual' : tc.automated;
      const reason = tc.nonAutomatableReason ? ' (' + tc.nonAutomatableReason + ')' : '';
      lines.push('[' + status + reason + '] ' + tc.id);
      lines.push('  ' + tc.scenario);
      if (tc.automated !== false) {
        lines.push('  $ pnpm test:release:grep ' + tc.id);
      }
      lines.push('');
    }
  }
  lines.push('');
  lines.push('Fixture workspace: /workspace/packages/rangelink-vscode-extension/qa/fixtures/workspace');
  require('fs').writeFileSync('$TC_FILE', lines.join('\n'));
"

echo "==> Wrote $TC_FILE"

# First run: populate the container-native node_modules volume (Linux binaries for esbuild etc.)
if [[ ! -d /workspace/node_modules/.pnpm ]]; then
  echo "==> Installing dependencies (first run, cached on subsequent runs)..."
  cd /workspace
  pnpm install 2>&1
  echo "==> Dependencies ready"
fi

# Build and package the extension (Linux-native esbuild from the Docker volume).
# vsce triggers vscode:prepublish which runs tests — skip that by calling vsce directly.
echo "==> Building extension..."
cd /workspace
pnpm --filter rangelink-vscode-extension compile 2>&1
cd /workspace/packages/rangelink-vscode-extension
../../scripts/sync-assets.sh 2>&1
npx vsce package --no-dependencies 2>&1
VSIX=$(ls /workspace/packages/rangelink-vscode-extension/rangelink-vscode-extension-*.vsix 2>/dev/null | head -1)
if [[ -z "$VSIX" ]]; then
  echo "ERROR: .vsix not found after build — extension will not be installed" >&2
  exit 1
fi

# Start VNC server on :1 — no auth for local Docker use
tigervncserver :1 -geometry 1680x1050 -depth 24 -localhost yes -SecurityTypes None

# Install the extension into VS Code (needs X running)
sleep 2
if [[ -n "$VSIX" ]]; then
  echo "==> Installing extension: $VSIX"
  if ! DISPLAY=:1 code --install-extension "$VSIX" 2>&1; then
    echo "ERROR: Failed to install extension: $VSIX" >&2
    exit 1
  fi
fi

# Launch VS Code with fixture workspace
DISPLAY=:1 code "/workspace/packages/rangelink-vscode-extension/qa/fixtures/workspace" &

# Bridge VNC (5901) to WebSocket (6080)
websockify --web /usr/share/novnc 0.0.0.0:6080 localhost:5901 &

echo ""
echo "============================================="
echo "  Ubuntu QA Desktop ready"
echo "  Open: http://localhost:6080/vnc.html"
echo "============================================="
echo ""

wait
