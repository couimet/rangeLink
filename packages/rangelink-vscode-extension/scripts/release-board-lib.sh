#!/usr/bin/env bash
#
# Shared GitHub Projects V2 helpers sourced by the release scripts.
# All functions print results on stdout and errors on stderr.
#
# gh api graphql -F does not parse nested JSON, so every GraphQL call writes
# the query plus variables JSON to a temp file and runs gh api graphql --input.
#
# Usage:
#   source "$SCRIPT_DIR/release-board-lib.sh"

graphql_call() {
  # $1 = JSON body with query and variables; prints the API response
  local tmp
  tmp="$(mktemp)"
  echo "$1" > "$tmp"
  gh api graphql --input "$tmp"
  rm -f "$tmp"
}

list_release_projects() {
  # Prints the viewer's projectsV2 JSON: nodes with id, number, title, and
  # single-select fields (id, name, options).
  graphql_call "$(jq -n --arg q 'query { viewer { projectsV2(first: 100) { nodes { id number title fields(first: 20) { nodes { ... on ProjectV2SingleSelectField { id name options { id name } } } } } } } }' '{query: $q, variables: {}}')"
}

resolve_release_board() {
  # $1 = board title. Prints "<board id>\t<board number>"; exits 1 with the
  # candidate titles when no project matches the title exactly.
  local title="$1"
  local projects_json
  projects_json=$(list_release_projects)
  local match
  match=$(echo "$projects_json" | jq -r --arg title "$title" '.data.viewer.projectsV2.nodes // [] | .[] | select(.title == $title) | "\(.id)\t\(.number)"' | head -1)
  if [[ -z "$match" ]]; then
    echo -e "${RED:-}Error: no project board titled '$title' found.${NC:-}" >&2
    echo "Available project boards:" >&2
    echo "$projects_json" | jq -r '.data.viewer.projectsV2.nodes // [] | .[] | "  - \(.title) (project #\(.number))"' >&2
    return 1
  fi
  echo "$match"
}

resolve_status_ready() {
  # $1 = projectsV2 JSON from list_release_projects; $2 = board id.
  # Prints "<status field id>\t<ready option id>"; prints nothing when the
  # board has no Status field, and "<field id>" alone when Ready is missing.
  echo "$1" | jq -r --arg id "$2" '.data.viewer.projectsV2.nodes[] | select(.id == $id) | .fields.nodes[] | select(.name == "Status") | [.id, ((.options // [] | .[] | select(.name == "Ready") | .id) // null)] | @tsv' | head -1
}

add_board_item() {
  # $1 = project id; $2 = content node id. Prints the new item id.
  local payload
  payload=$(jq -n \
    --arg pid "$1" \
    --arg cid "$2" \
    '{query: "mutation($input: AddProjectV2ItemByIdInput!) { addProjectV2ItemById(input: $input) { item { id } } }", variables: {input: {projectId: $pid, contentId: $cid}}}')
  graphql_call "$payload" | jq -r '.data.addProjectV2ItemById.item.id'
}

set_board_field_value() {
  # $1 = project id; $2 = item id; $3 = field id; $4 = single-select option id.
  local payload
  payload=$(jq -n \
    --arg pid "$1" \
    --arg iid "$2" \
    --arg fid "$3" \
    --arg oid "$4" \
    '{query: "mutation($input: UpdateProjectV2ItemFieldValueInput!) { updateProjectV2ItemFieldValue(input: $input) { projectV2Item { id } } }", variables: {input: {projectId: $pid, itemId: $iid, fieldId: $fid, value: {singleSelectOptionId: $oid}}}}')
  graphql_call "$payload" > /dev/null
}
