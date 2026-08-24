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
  if ! gh api graphql --input "$tmp"; then
    rm -f "$tmp"
    return 1
  fi
  rm -f "$tmp"
}

list_release_projects() {
  # Prints the viewer's projectsV2 JSON: nodes with id, number, title, url,
  # owner, and single-select fields (id, name, options).
  graphql_call "$(jq -n --arg q 'query { viewer { projectsV2(first: 100) { nodes { id number title url owner { ... on User { id } ... on Organization { id } } fields(first: 20) { nodes { ... on ProjectV2SingleSelectField { id name options { id name } } } } } } } }' '{query: $q, variables: {}}')"
}

resolve_release_board() {
  # $1 = board title. Prints "<board id>\t<board number>\t<board url>"; exits 1
  # with the candidate titles when no project matches the title exactly.
  local title="$1"
  local projects_json
  projects_json=$(list_release_projects)
  local match
  match=$(echo "$projects_json" | jq -r --arg title "$title" '.data.viewer.projectsV2.nodes // [] | .[] | select(.title == $title) | "\(.id)\t\(.number)\t\(.url)"' | head -1)
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

fetch_project_items() {
  # $1 = project id. Prints the project's items JSON as
  # {"data": {"node": {"items": {"nodes": [ ...all item nodes across all pages... ]}}}};
  # each item node carries statusValue/priorityValue/sizeValue — the single-select
  # option names for Status/Priority/Size read via fieldValueByName so they survive
  # items with more than 40 field values; pages through the items(first: 100)
  # connection until hasNextPage is false.
  local query='query ($id: ID!, $cursor: String) {
    node(id: $id) {
      ... on ProjectV2 {
        items(first: 100, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            content {
              __typename
              ... on Issue { id }
              ... on PullRequest { id }
              ... on DraftIssue { id title body }
            }
            statusValue: fieldValueByName(name: "Status") {
              ... on ProjectV2ItemFieldSingleSelectValue { name }
            }
            priorityValue: fieldValueByName(name: "Priority") {
              ... on ProjectV2ItemFieldSingleSelectValue { name }
            }
            sizeValue: fieldValueByName(name: "Size") {
              ... on ProjectV2ItemFieldSingleSelectValue { name }
            }
          }
        }
      }
    }
  }'
  local id="$1"
  local cursor=""
  local tmp
  tmp="$(mktemp)"
  while true; do
    local page_json has_next end_cursor
    page_json=$(graphql_call "$(jq -n --arg query "$query" --arg id "$id" --arg cursor "$cursor" '{query: $query, variables: {id: $id, cursor: $cursor}}')")
    echo "$page_json" | jq -c '.data.node.items.nodes // []' >> "$tmp"
    has_next=$(echo "$page_json" | jq -r '.data.node.items.pageInfo.hasNextPage')
    end_cursor=$(echo "$page_json" | jq -r '.data.node.items.pageInfo.endCursor')
    if [[ "$has_next" != "true" ]]; then
      break
    fi
    cursor="$end_cursor"
  done
  jq -n --slurpfile pages "$tmp" '{data: {node: {items: {nodes: ($pages | add)}}}}'
  rm -f "$tmp"
}

add_board_draft() {
  # $1 = project id; $2 = draft title; $3 = draft body. Prints the new item id.
  local payload
  payload=$(jq -n \
    --arg pid "$1" \
    --arg title "$2" \
    --arg body "$3" \
    '{query: "mutation($input: AddProjectV2DraftIssueInput!) { addProjectV2DraftIssue(input: $input) { projectV2Item { id } } }", variables: {input: {projectId: $pid, title: $title, body: $body}}}')
  graphql_call "$payload" | jq -r '.data.addProjectV2DraftIssue.projectV2Item.id'
}

delete_board_item() {
  # $1 = project id; $2 = item id. Deletes the item; prints nothing.
  local payload
  payload=$(jq -n \
    --arg pid "$1" \
    --arg iid "$2" \
    '{query: "mutation($input: DeleteProjectV2ItemInput!) { deleteProjectV2Item(input: $input) { deletedItemId } }", variables: {input: {projectId: $pid, itemId: $iid}}}')
  graphql_call "$payload" > /dev/null
}

resolve_status_done() {
  # $1 = projectsV2 JSON from list_release_projects; $2 = board id.
  # Prints "<status field id>\t<done option id>"; prints nothing when the
  # board has no Status field, and "<field id>" alone when Done is missing.
  echo "$1" | jq -r --arg id "$2" '.data.viewer.projectsV2.nodes[] | select(.id == $id) | .fields.nodes[] | select(.name == "Status") | [.id, ((.options // [] | .[] | select(.name == "Done") | .id) // null)] | @tsv' | head -1
}

find_board_item_id() {
  # $1 = project id; $2 = content node id (Issue/PullRequest/DraftIssue).
  # Prints the project item id whose content matches, or nothing when absent.
  # fetch_project_items yields nodes: null when the items GraphQL call failed;
  # treat that as a lookup error so callers can distinguish it from an item
  # that is genuinely not on the board.
  local items_json nodes_missing
  items_json=$(fetch_project_items "$1")
  nodes_missing=$(printf '%s' "$items_json" | jq -r '.data.node.items.nodes == null')
  if [[ "$nodes_missing" == "true" ]]; then
    return 1
  fi
  echo "$items_json" | jq -r --arg cid "$2" '.data.node.items.nodes[]? | select(.content.id == $cid) | .id' | head -1
}
