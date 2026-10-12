#!/usr/bin/env bash
set -euo pipefail

# Single canonical entrypoint for the Ralph loop.
# Runs the bounded loop from the workspace root.
#
# Usage: ./scripts/run.sh [max-iterations]   (default: 10)

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd "$ROOT_DIR"

exec ./ralph.sh "$@"
