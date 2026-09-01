#!/usr/bin/env bash
set -euo pipefail

# Run development-test scenarios in real Extension Development Hosts where
# modal dialogs render with keyboard focus (the test host refuses modals). The
# scenarios auto-run after activation (RANGELINK_DEVELOPMENT=true); the human
# performs only the dialog keystroke (e.g. Enter on the focused button); the
# extension auto-verifies and appends a JSONL result under qa/output/.
#
# The scenario set comes from qa-test-cases.yaml: every TC carrying
# `runner: [development]` is eligible, and ALL eligible scenarios run by
# default (one fresh dev host per scenario). An optional positional pattern
# narrows the set with grep -E over the resolved scenario ids — plain args,
# no `--`, exactly like the test:release:grep scripts.
#
# Usage:
#   pnpm test:release:development                          # run all development scenarios
#   pnpm test:release:development dirty-buffer-warning     # substring match
#   pnpm test:release:development "0(24|25)"               # regex / OR
#
# Output: qa/output/development-run-<timestamp>-<id>.jsonl per scenario

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGE_ROOT="$SCRIPT_DIR/.."
cd "$PACKAGE_ROOT"

PATTERN="${1:-}"

# ── Resolve the code CLI ───────────────────────────────────────────────────────

resolve_code() {
  local candidate
  candidate="$(command -v code 2>/dev/null || true)"
  if [[ -n "$candidate" ]]; then
    local real_path
    real_path="$(readlink "$candidate" 2>/dev/null || echo "$candidate")"
    if [[ "$real_path" == *"Cursor.app"* ]]; then
      # 'code' on PATH points at Cursor; prefer real VS Code for the dev host
      if [[ -x "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" ]]; then
        echo "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
        return
      fi
    fi
    echo "$candidate"
    return
  fi
  if [[ -x "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" ]]; then
    echo "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
    return
  fi
  echo "Error: 'code' CLI not found on PATH or in /Applications/Visual Studio Code.app" >&2
  exit 1
}
CODE_BIN="$(resolve_code)"

# ── Prepare build ──────────────────────────────────────────────────────────────

echo "Preparing build (bundle + out/__development-tests__)..."
pnpm compile

# The main tsconfig type-checks src/__tests__ too, which carries pre-existing
# errors — tsc still emits out/, so tolerate its exit code but require the runner.
set +e
tsc -p tsconfig.json
TSC_EXIT=$?
set -e
if [[ $TSC_EXIT -ne 0 ]]; then
  echo "Note: tsc reported type errors (pre-existing in src/__tests__); the runner still emitted." >&2
fi
if [[ ! -f "out/__development-tests__/runDevelopmentTests.js" ]]; then
  echo "Error: tsc did not emit out/__development-tests__/runDevelopmentTests.js" >&2
  exit 1
fi

# ── Resolve the eligible scenario set ──────────────────────────────────────────

# The 1st filter is the `runner: [development]` YAML attribute; the optional
# positional arg is a 2nd grep -E filter over the resolved scenario ids.
RESOLVED_IDS="$(node "$SCRIPT_DIR/resolve-qa-labels.js" --runner development 2>/dev/null || true)"
if [[ -n "$PATTERN" ]]; then
  RESOLVED_IDS="$(printf '%s\n' "$RESOLVED_IDS" | grep -E "$PATTERN" || true)"
fi
RESOLVED_IDS="$(printf '%s\n' "$RESOLVED_IDS" | grep -E '.+' || true)"

if [[ -z "$RESOLVED_IDS" ]]; then
  echo "Error: no development-runner scenarios matched." >&2
  if [[ -n "$PATTERN" ]]; then
    echo "Pattern: $PATTERN" >&2
  fi
  echo "Available development-runner scenario ids:" >&2
  node "$SCRIPT_DIR/resolve-qa-labels.js" --runner development 2>/dev/null | sed 's/^/  /' >&2 || true
  exit 1
fi

echo "Resolved $(printf '%s\n' "$RESOLVED_IDS" | wc -l | tr -d ' ') development scenario(s):"
echo "$RESOLVED_IDS" | sed 's/^/  /'
echo ""

# ── Shared dirs ─────────────────────────────────────────────────────────────────

OUTPUT_DIR="$PACKAGE_ROOT/qa/output"
mkdir -p "$OUTPUT_DIR"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")

WORKSPACE_DIR="$OUTPUT_DIR/development-test-workspace"
mkdir -p "$WORKSPACE_DIR"

EXTENSIONS_DIR="$OUTPUT_DIR/development-test-extensions"
mkdir -p "$EXTENSIONS_DIR"

REPO_ROOT="$(git rev-parse --show-toplevel)"

APP_VERSION="$("$CODE_BIN" --version 2>/dev/null | head -1 || true)"
HAS_SQLITE=false
if command -v sqlite3 >/dev/null 2>&1; then
  HAS_SQLITE=true
fi

# A dev host left by an earlier interrupted run can make a fresh launch die in
# the first seconds of startup (observed: profile initialized, no service logs
# written, no window). Clean up any lingering instance before the loop.
pkill -9 -f "rangelink-development-profile" 2>/dev/null || true
sleep 1

# Shared by every launch: the runner flag, log capture, and test fixtures are
# constant across scenarios. The `code` CLI and Electron consult the unset
# hooks: inside a VS Code integrated terminal VSCODE_IPC_HOOK_CLI routes `code`
# to a remote CLI; a stray ELECTRON_RUN_AS_NODE makes the app run as a headless
# node process; and NODE_OPTIONS is forwarded to the app's node helper
# processes (the very services that write the session logs), so a stale value —
# a common .zshrc / node-version-manager injection — makes every helper fail to
# start and the app exits quietly with an empty logs session. Unset them so the
# dev host always launches as a real local app with healthy helpers.
export RANGELINK_DEVELOPMENT=true
export RANGELINK_CAPTURE_LOGS=true
export RANGELINK_TEST_FIXTURES_ENABLED=true
unset VSCODE_IPC_HOOK_CLI ELECTRON_RUN_AS_NODE ELECTRON_OVERRIDE_DIST_PATH NODE_OPTIONS 2>/dev/null || true

# ── Launch helpers ──────────────────────────────────────────────────────────────

# The report file doubles as a launch log: each step (launch intent, PID,
# liveness, failure) lands there immediately, so a silent startup death is
# visible in the file itself instead of a bare 5-minute timeout.
write_event() {
  local event="$1"
  local extra="${2:-}"
  local line
  line="{\"event\":\"$event\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\""
  if [[ -n "$extra" ]]; then
    line+=",$extra"
  fi
  line+="}"
  printf '%s\n' "$line" >> "$REPORT_FILE"
}

launch_log_tail() {
  if [[ -s "$LAUNCH_LOG" ]]; then
    tail -c 2000 "$LAUNCH_LOG"
  fi
}

# The app's main process — carries the profile dir on its command line (unlike
# the bash wrapper, the cli.js node process, and the --type= helper processes).
dev_host_pids() {
  ps ax -o pid= -o command= | grep -F "$PROFILE_DIR" | grep -v -- "cli.js" | grep -v -- "--type=" | grep -v "bash " | grep -v "grep" || true
}

# ── Run one scenario ───────────────────────────────────────────────────────────

run_one_scenario() {
  local id="$1"

  PROFILE_DIR="/tmp/rangelink-development-profile-${TIMESTAMP}-${id}"
  REPORT_FILE="$OUTPUT_DIR/development-run-${TIMESTAMP}-${id}.jsonl"
  LAUNCH_LOG="$OUTPUT_DIR/development-test-launch-${TIMESTAMP}-${id}.log"
  touch "$REPORT_FILE"

  # A fresh workspace keeps a prior scenario's fixture files from leaking into
  # the next one's (scenarios write their dirty file by a per-scenario name).
  rm -f "$WORKSPACE_DIR"/*.txt

  # Isolated profile + extensions dir (mirrors userDataDir() in
  # .vscode-test.base.mjs). A fresh profile yields the default
  # unsavedFile.action=prompt (the modal 024 needs), and an empty extensions dir
  # keeps an installed RangeLink copy from double-loading alongside the dev host.
  # Workspace trust is disabled up front: a fresh profile otherwise blocks on the
  # trust prompt and onStartupFinished never fires, so the extension never activates.
  # Per-scenario profile dir: a prior run's dev host may still be open holding its
  # profile, and rm -rf on a live app's profile fails on macOS ("Directory not
  # empty"). A unique dir per scenario sidesteps the collision entirely.
  # Note: pin to /tmp, NOT $TMPDIR. This machine's $TMPDIR is a long
  # /var/folders/... path, and the app binds its IPC socket INSIDE the profile
  # dir; a socket path over macOS's ~104-byte sun_path limit makes bind() fail
  # with EINVAL and the app exits cleanly a second after launch.
  mkdir -p "$PROFILE_DIR/User"
  # A fresh profile also triggers VS Code's first-run Welcome page, whose
  # "Continue without signing in" screen covers the dirty-buffer modal. Skip the
  # onboarding + auto-update + telemetry prompts so nothing can overlap a dialog.
  cat > "$PROFILE_DIR/User/settings.json" <<'JSON'
{
  "security.workspace.trust.enabled": false,
  "workbench.startupEditor": "none",
  "workbench.welcomePage.walkthroughs.openOnInstall": false,
  "update.mode": "none",
  "extensions.autoCheckUpdates": false,
  "telemetry.telemetryLevel": "off"
}
JSON
  # The settings above skip the walkthrough and telemetry, but VS Code's first-run
  # "Welcome to VS Code / Continue without signing in" overlay is gated by the
  # profile's storage DB — a fresh profile re-shows it every run, covering the
  # modal the scenarios exercise. Pre-seed the "onboarding done" flag (and the
  # release-notes version) so no first-run overlay can appear over a dialog.
  if [[ "$HAS_SQLITE" == "true" ]]; then
    mkdir -p "$PROFILE_DIR/User/globalStorage"
    sqlite3 "$PROFILE_DIR/User/globalStorage/state.vscdb" \
      "CREATE TABLE IF NOT EXISTS ItemTable (key TEXT UNIQUE ON CONFLICT REPLACE, value BLOB); \
       INSERT OR REPLACE INTO ItemTable (key, value) VALUES ('welcomeOnboarding.state', 'true');" 2>/dev/null || true
    if [[ -n "$APP_VERSION" ]]; then
      sqlite3 "$PROFILE_DIR/User/globalStorage/state.vscdb" \
        "INSERT OR REPLACE INTO ItemTable (key, value) VALUES ('releaseNotes/lastVersion', '$APP_VERSION');" 2>/dev/null || true
    fi
  fi

  echo "──────────────────────────────────────────────"
  echo "Scenario: $id"
  echo "Report:   ${REPORT_FILE#"$REPO_ROOT"/}"

  export RANGELINK_DEVELOPMENT_SCENARIO="$id"
  export RANGELINK_DEVELOPMENT_REPORT="$REPORT_FILE"

  # Record the launch environment so a failure self-documents exactly what the
  # app saw (cli.js forwards the parent env to the spawned app). An explicit
  # allowlist keeps the report file free of secrets.
  LAUNCH_ENV_JSON="$(python3 -c '
import json, os, sys
ALLOW = [
  "RANGELINK_DEVELOPMENT", "RANGELINK_DEVELOPMENT_SCENARIO",
  "RANGELINK_DEVELOPMENT_REPORT", "RANGELINK_DEVELOPMENT_KEEP_HOST",
  "RANGELINK_CAPTURE_LOGS", "RANGELINK_TEST_FIXTURES_ENABLED",
  "RANGELINK_TEST_HOST", "RANGELINK_CUSTOM_AI_COUNT",
  "NODE_OPTIONS", "ELECTRON_RUN_AS_NODE", "ELECTRON_OVERRIDE_DIST_PATH",
  "VSCODE_IPC_HOOK_CLI",
  "PATH", "HOME", "SHELL", "TERM", "LANG", "USER", "TMPDIR",
]
enc = sys.stdout.reconfigure if hasattr(sys.stdout, "reconfigure") else None
if enc: enc(errors="replace")
print(json.dumps({k: os.environ.get(k) for k in ALLOW if k in os.environ}, default=str))
' 2>/dev/null || echo '{}')"
  write_event "launch_env" "\"env\":$LAUNCH_ENV_JSON"

  LAUNCH_ARGS=(--skip-welcome --skip-sessions-welcome --skip-release-notes --user-data-dir "$PROFILE_DIR" --extensions-dir "$EXTENSIONS_DIR" --extensionDevelopmentPath "$PACKAGE_ROOT" --new-window "$WORKSPACE_DIR")
  LAUNCH_PAYLOAD="$(CODE_BIN="$CODE_BIN" SCENARIO="$id" PROFILE_DIR="$PROFILE_DIR" WORKSPACE_DIR="$WORKSPACE_DIR" python3 -c '
import json, os, sys
print(json.dumps({
  "command": os.environ["CODE_BIN"],
  "args": sys.argv[1:],
  "scenario": os.environ["SCENARIO"],
  "profile": os.environ["PROFILE_DIR"],
  "workspace": os.environ["WORKSPACE_DIR"],
}))' "${LAUNCH_ARGS[@]}")"
  write_event "launch" "$LAUNCH_PAYLOAD"

  echo "Opening dev host — scenario $id runs automatically after activation."
  echo "When the modal dialog appears, press the key the status bar asks for."
  echo ""
  echo "Watching $REPORT_FILE for the result..."

  "$CODE_BIN" "${LAUNCH_ARGS[@]}" >"$LAUNCH_LOG" 2>&1 </dev/null &
  CLI_PID=$!
  write_event "launched" "\"pid\":$CLI_PID"

  # Wait up to ~20s for the app process to appear, then confirm it survives
  # startup (the `code` CLI hands off and exits). Catches a launch that dies in
  # the first seconds and fails fast instead of timing out silently.
  APP_ALIVE=false
  for _ in $(seq 1 10); do
    if [[ -n "$(dev_host_pids)" ]]; then
      APP_ALIVE=true
      break
    fi
    sleep 2
  done
  if [[ "$APP_ALIVE" == "true" ]]; then
    sleep 5
    if [[ -z "$(dev_host_pids)" ]]; then
      APP_ALIVE=false
    fi
  fi

  if [[ "$APP_ALIVE" != "true" ]]; then
    TAIL_JSON="$(launch_log_tail | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')"
    PROFILE_LOGS_JSON="$(find "$PROFILE_DIR/logs" -type f 2>/dev/null | head -10 | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read().strip()))')"
    write_event "launch_failed" "\"pid\":$CLI_PID,\"launch_log_tail\":$TAIL_JSON,\"profile_log_files\":$PROFILE_LOGS_JSON"
    echo "Error: the dev host exited shortly after launch — see $REPORT_FILE" >&2
    echo "Launch log: $LAUNCH_LOG" >&2
    tail -n 20 "$LAUNCH_LOG" >&2 || true
    return 1
  fi
  APP_PID="$(dev_host_pids | awk '{print $1}' | head -1)"
  write_event "app_alive" "\"pid\":$APP_PID"

  # Poll for the scenario's verdict line. The report file already carries our
  # launch events, so match on "verdict" rather than any non-empty content.
  RESULT=""
  for _ in $(seq 1 275); do
    # Scan the whole file, not just the last line: the scenario may write its
    # verdict BEFORE the driver appends its own app_alive event, so tail -n 1
    # can read the app_alive line and miss the verdict entirely.
    LAST="$(grep '"verdict"' "$REPORT_FILE" 2>/dev/null | tail -n 1 || true)"
    if [[ -n "$LAST" ]]; then
      RESULT="$LAST"
      break
    fi
    sleep 1
  done

  if [[ -z "$RESULT" ]]; then
    TAIL_JSON="$(launch_log_tail | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')"
    PROFILE_LOGS_JSON="$(find "$PROFILE_DIR/logs" -type f 2>/dev/null | head -10 | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read().strip()))')"
    write_event "timeout" "\"waited_seconds\":275,\"launch_log_tail\":$TAIL_JSON,\"profile_log_files\":$PROFILE_LOGS_JSON"
    echo "" >&2
    echo "Error: timed out waiting for a result in $REPORT_FILE (5 minutes)." >&2
    echo "Launch log: $LAUNCH_LOG" >&2
    tail -n 20 "$LAUNCH_LOG" >&2 || true
    return 1
  fi

  echo ""
  echo "Result: $RESULT"

  # The run is over — quit the dev host so no orphan app lingers (the report
  # file and launch log already captured the full run state). Set
  # RANGELINK_DEVELOPMENT_KEEP_HOST=1 to keep it open for inspection.
  if [[ "${RANGELINK_DEVELOPMENT_KEEP_HOST:-}" != "1" ]]; then
    pkill -9 -f "$PROFILE_DIR" 2>/dev/null || true
    sleep 1
  fi

  VERDICT="$(echo "$RESULT" | python3 -c 'import json,sys; print(json.load(sys.stdin)["verdict"])' 2>/dev/null || true)"
  if [[ "$VERDICT" == "PASS" ]]; then
    echo "Development test $id: PASS"
    return 0
  fi

  echo "Development test $id: FAIL"
  return 1
}

# ── Drive every resolved scenario ──────────────────────────────────────────────

PASS_COUNT=0
FAIL_COUNT=0
FAILED_IDS=()

while IFS= read -r id; do
  if run_one_scenario "$id"; then
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAILED_IDS+=("$id")
  fi
done <<< "$RESOLVED_IDS"

echo ""
echo "══════════════════════════════════════════════"
echo "Development-test run complete: $PASS_COUNT passed, $FAIL_COUNT failed"
if [[ ${#FAILED_IDS[@]} -gt 0 ]]; then
  echo "Failed scenario(s):"
  printf '  %s\n' "${FAILED_IDS[@]}"
  echo "See qa/output/development-run-${TIMESTAMP}-<id>.jsonl for details."
  exit 1
fi
echo "All scenarios passed."
exit 0
