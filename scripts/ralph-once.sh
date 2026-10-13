#!/usr/bin/env bash
set -euo pipefail

# Run one fresh agent iteration from this repository's root.
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
ROOT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd -P)"
cd "$ROOT_DIR"

[[ -f prd.json ]] || {
  echo "Create prd.json first (copy prd.json.example)." >&2
  exit 1
}

cmd -p --yolo --verbose "$(cat "$ROOT_DIR/blueprint/PROMPT.md")"
