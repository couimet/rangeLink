#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(git -C "$PACKAGE_DIR" rev-parse --show-toplevel)"
GIT_COMMON_DIR="$(git -C "$REPO_ROOT" rev-parse --git-common-dir)"
[[ "$GIT_COMMON_DIR" != /* ]] && GIT_COMMON_DIR="$REPO_ROOT/$GIT_COMMON_DIR"

IMAGE="rangelink-qa-ubuntu"
CONTAINER="rangelink-qa-ubuntu-$(date +%s)"
DOCKERFILE="${PACKAGE_DIR}/docker/Dockerfile.ubuntu"
ENTRYPOINT="${PACKAGE_DIR}/docker/entrypoint.sh"
STAMP="${PACKAGE_DIR}/.docker-image-stamp"

build() {
  echo "==> Building Docker image: ${IMAGE}"
  docker build -t "${IMAGE}" -f "$DOCKERFILE" "${PACKAGE_DIR}"
  touch "$STAMP"
  echo "==> Build complete"
}

needs_rebuild() {
  if ! docker image inspect "${IMAGE}" &>/dev/null; then
    return 0
  fi
  if [[ ! -f "$STAMP" ]]; then
    return 0
  fi
  [[ "$DOCKERFILE" -nt "$STAMP" || "$ENTRYPOINT" -nt "$STAMP" ]]
}

print_ubuntu_tcs() {
  echo ""
  echo "============================================="
  echo "  Ubuntu TCs to verify"
  echo "============================================="
  echo ""

  node "$SCRIPT_DIR/resolve-qa-labels.js" --json 2>/dev/null | node -e "
    const d = JSON.parse(require('fs').readFileSync(0, 'utf8'));
    const tcs = d.ubuntu_tcs;
    if (!tcs.length) {
      console.log('No Ubuntu-specific TCs found.');
    } else {
      for (const tc of tcs) {
        const status = tc.automated === false ? 'manual' : tc.automated;
        const reason = tc.nonAutomatableReason ? ' (' + tc.nonAutomatableReason + ')' : '';
        console.log('  [' + status + reason + '] ' + tc.id);
        console.log('    ' + tc.scenario);
        console.log('');
      }
    }
  "

  echo "TCs also written to ~/Desktop/qa-ubuntu-tests.txt inside the container."
  echo ""
}

run() {
  # Remove any existing rangelink-qa-ubuntu containers (running, stopped, or crashed)
  local existing
  existing=$(docker ps -aq --filter "name=rangelink-qa-ubuntu" 2>/dev/null)
  if [[ -n "$existing" ]]; then
    echo "==> Removing existing container(s)..."
    docker rm -f $existing >/dev/null 2>&1
  fi

  echo "==> Starting container: ${CONTAINER}"
  echo "    Repo mounted at /workspace"
  echo "    Git mounted at ${GIT_COMMON_DIR}"
  echo ""
  docker run \
    --name "${CONTAINER}" \
    -p 6080:6080 \
    --shm-size=2g \
    --rm \
    -v "${REPO_ROOT}:/workspace" \
    -v "${GIT_COMMON_DIR}:${GIT_COMMON_DIR}:ro" \
    -v rangelink-qa-node-modules:/workspace/node_modules \
    "${IMAGE}"
}

case "${1:-run}" in
  build)
    build
    ;;
  run)
    if needs_rebuild; then
      echo "Dockerfile/entrypoint changed — rebuilding..."
      build
    fi
    print_ubuntu_tcs
    run
    ;;
  *)
    echo "Usage: $0 [build|run]" >&2
    echo "  build   Build the Docker image" >&2
    echo "  run     Run the container (default; auto-rebuilds if Dockerfile changed)" >&2
    exit 1
    ;;
esac
