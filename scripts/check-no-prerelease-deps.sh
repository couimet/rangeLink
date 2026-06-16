#!/usr/bin/env bash
set -euo pipefail

readonly EXIT_OK=0
readonly EXIT_FOUND_PRERELEASE=1
readonly EXIT_MISSING_JQ=2

readonly PRERELEASE_TOKENS=("-alpha" "-beta" "-rc" "-pre")

_require_jq() {
  if ! command -v jq >/dev/null 2>&1; then
    echo "error: jq is required" >&2
    exit "$EXIT_MISSING_JQ"
  fi
}

_discover_package_files() {
  find . -type f -name 'package.json' \
    | grep -v '/node_modules/' \
    | grep -v '/out/' \
    | grep -v '/dist/' \
    | grep -v '/\.vscode-test/' \
    | grep -v '/coverage/' \
    || true
}

_jq_filter() {
  cat <<'JQ'
(.dependencies // {}) + (.devDependencies // {}) + (.peerDependencies // {}) + (.optionalDependencies // {})
| to_entries[]
| select(
    (.value | type == "string")
    and (
      (.value | contains("-alpha"))
      or (.value | contains("-beta"))
      or (.value | contains("-rc"))
      or (.value | contains("-pre"))
    )
  )
| "\(.key)\t\(.value)"
JQ
}

_scan_file() {
  local file="$1"
  local found_in_file=0

  while IFS=$'\t' read -r dep_name dep_version; do
    [[ -z "$dep_name" ]] && continue
    echo "error: prerelease dep '${dep_name}@${dep_version}' in ${file}" >&2
    found_in_file=1
  done < <(jq -r "$(_jq_filter)" "$file")

  return "$found_in_file"
}

main() {
  _require_jq

  local files=()
  if [[ $# -gt 0 ]]; then
    files=("$@")
  else
    while IFS= read -r path; do
      [[ -n "$path" ]] && files+=("$path")
    done < <(_discover_package_files)
  fi

  local any_found=0
  local file
  for file in "${files[@]:-}"; do
    [[ -z "$file" ]] && continue
    if ! _scan_file "$file"; then
      any_found=1
    fi
  done

  if [[ "$any_found" -eq 1 ]]; then
    exit "$EXIT_FOUND_PRERELEASE"
  fi
  exit "$EXIT_OK"
}

main "$@"
