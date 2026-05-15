#!/usr/bin/env bash

# Shared test helper for bats test suites.
# Source from .bats files via: load test_helper

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

setup() {
  TEST_TEMP_DIR="$(mktemp -d)"
}

teardown() {
  rm -rf "${TEST_TEMP_DIR:?}"
}
