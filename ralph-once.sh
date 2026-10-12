#!/usr/bin/env bash
set -euo pipefail

# Run one fresh agent iteration from this repository's root.
ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
cd "$ROOT_DIR"

[[ -f prd.json ]] || {
  echo "Create prd.json first (copy prd.json.example)." >&2
  exit 1
}

cmd -p --yolo --verbose "$(cat PROMPT.md)"
