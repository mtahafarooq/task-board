#!/usr/bin/env bash
set -euo pipefail

# Run the Ralph backlog in prd.json, one fresh iteration at a time.
#
# Each iteration prints a single line - the current iteration out of the total,
# and the task it is working on - then runs ralph-once.sh. The loop stops when
# every task passes, when the agent reports it is blocked or failed, when
# prd.json stops changing, or when the iteration limit is reached.
#
# Usage: ./ralph.sh [max-iterations]   (default: 10)
#
# Exit status: 0 when every task passes, 1 otherwise.

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
cd "$ROOT_DIR"

MAX_ITERATIONS="${1:-10}"
if ! [[ "$MAX_ITERATIONS" =~ ^[1-9][0-9]*$ ]]; then
  printf 'ralph: iteration count must be a positive integer (got: %s)\n' "$MAX_ITERATIONS" >&2
  exit 2
fi

if [[ ! -f prd.json ]]; then
  echo "ralph: prd.json not found. Create one first (copy prd.json.example)." >&2
  exit 1
fi

./validate-prd.sh prd.json || exit 1

LOG_DIR="$ROOT_DIR/.ralph/logs"
mkdir -p "$LOG_DIR"

STATE_TOTAL=0
STATE_REMAINING=0
STATE_READY_ID=""
STATE_READY_TITLE=""

# Reads prd.json and fills the STATE_* variables with the backlog size, the
# number of open tasks, and the next ready task (lowest priority, then
# document order). A task is ready when it is open and every dependency passes.
load_state() {
  local line
  line="$(jq -r '
    . as $r
    | ([ $r.tasks[] | select(.passes) | .id ]) as $done
    | ($r.tasks | map(select(.passes == false))) as $open
    | ($open | map(select([ .dependsOn[] as $d | ($done | index($d)) != null ] | all))) as $ready
    | (($ready | sort_by(.priority))[0]) as $next
    | [ ($r.tasks | length), ($open | length), ($next.id // ""), ($next.title // "") ]
    | @tsv
  ' prd.json)"
  IFS=$'\t' read -r STATE_TOTAL STATE_REMAINING STATE_READY_ID STATE_READY_TITLE <<< "$line"
}

prd_fingerprint() {
  jq -S -c . prd.json | cksum
}

exit_code=0
iteration=0

while :; do
  load_state

  if (( STATE_REMAINING == 0 )); then
    printf 'All %s task(s) complete.\n' "$STATE_TOTAL"
    exit_code=0
    break
  fi

  if [[ -z "$STATE_READY_ID" ]]; then
    printf 'ralph: no ready task; %s task(s) remaining with unmet dependencies.\n' "$STATE_REMAINING" >&2
    exit_code=1
    break
  fi

  if (( iteration >= MAX_ITERATIONS )); then
    printf 'ralph: reached iteration limit (%s); %s task(s) remaining.\n' "$MAX_ITERATIONS" "$STATE_REMAINING" >&2
    exit_code=1
    break
  fi

  iteration=$(( iteration + 1 ))
  log_file="$LOG_DIR/iteration-$iteration.log"
  printf '[%s/%s] %s - %s\n' "$iteration" "$MAX_ITERATIONS" "$STATE_READY_ID" "$STATE_READY_TITLE"

  before="$(prd_fingerprint)"
  status=0
  ./ralph-once.sh > "$log_file" 2>&1 || status=$?
  after="$(prd_fingerprint)"

  if grep -q '<ralph>BLOCKED:' "$log_file"; then
    printf '  blocked - agent reported BLOCKED (see %s)\n' "$log_file" >&2
    exit_code=1
    break
  fi

  if grep -q '<ralph>FAILED:' "$log_file"; then
    printf '  failed - agent reported FAILED (see %s)\n' "$log_file" >&2
    exit_code=1
    break
  fi

  if (( status != 0 )); then
    printf '  error - iteration exited with status %s (see %s)\n' "$status" "$log_file" >&2
    exit_code=1
    break
  fi

  if [[ "$before" == "$after" ]]; then
    printf '  stalled - prd.json did not change (see %s)\n' "$log_file" >&2
    exit_code=1
    break
  fi

  load_state
  printf '  done - %s task(s) remaining\n' "$STATE_REMAINING"
done

exit "$exit_code"
