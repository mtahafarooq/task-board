#!/usr/bin/env bash
set -euo pipefail

# Validate a Ralph backlog against prd.schema.json.
#
# Checks the required top-level and per-task fields, the value shapes declared
# in prd.schema.json, and the semantic rules a schema cannot express: unique
# task ids, dependencies that resolve, and no dependency cycles.
#
# Usage: ./validate-prd.sh [path-to-prd.json]   (default: ./prd.json)

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
cd "$ROOT_DIR"

PRD_PATH="${1:-prd.json}"

die() {
  printf 'validate-prd: %s\n' "$*" >&2
  exit 1
}

[[ -f "$PRD_PATH" ]] || die "file not found: $PRD_PATH"
command -v jq >/dev/null 2>&1 || die "jq is required but was not found on PATH"

jq -e . "$PRD_PATH" >/dev/null 2>&1 || die "$PRD_PATH is not valid JSON"

JQ_PROGRAM='
def nonempty_str: if type == "string" then (length > 0) else false end;
def is_pos_int: if type == "number" then (. == (. | floor)) and (. >= 1) else false end;
def is_id: if type == "string" then test("^TASK-[0-9]{3,}$") else false end;
def task_fields: ["id","title","description","branchName","priority","dependsOn","acceptanceCriteria","passes","notes"];
def root_fields: ["$schema","schemaVersion","project","description","tasks"];

# Nodes reachable from $stack within the dependency graph $g.
def closure($g; $seen; $stack):
  if ($stack | length) == 0 then $seen
  else
    ($stack[0]) as $n
    | ($stack[1:]) as $rest
    | if ($seen | index($n)) != null then closure($g; $seen; $rest)
      else closure($g; ($seen + [$n]); ($rest + ($g[$n] // [])))
      end
  end;

def cycle_nodes($g):
  [ $g | keys[] as $start
    | select((closure($g; []; ($g[$start] // [])) | index($start)) != null)
    | $start ];

. as $root
| [
    if ($root | type) != "object" then
      "root: prd.json must be a JSON object"
    else
      ( (["schemaVersion","project","description","tasks"][]) as $k
        | select(($root | has($k)) | not)
        | "root: missing required field \"\($k)\"" ),
      ( ($root | keys[]) as $k
        | select((root_fields | index($k)) == null)
        | "root: unknown field \"\($k)\"" ),
      ( if $root.schemaVersion != 1 then "root: schemaVersion must be the integer 1" else empty end ),
      ( if ($root.project | nonempty_str | not) then "root: project must be a non-empty string" else empty end ),
      ( if ($root.description | nonempty_str | not) then "root: description must be a non-empty string" else empty end ),
      ( if ($root.tasks | type) != "array" then "root: tasks must be an array" else empty end )
    end,

    ( if ($root.tasks | type) == "array" then
        ($root.tasks | to_entries[]) as $e
        | ($e.key) as $i
        | ($e.value) as $t
        | if ($t | type) != "object" then
            "tasks[\($i)]: must be an object"
          else
            ( (task_fields[]) as $k
              | select(($t | has($k)) | not)
              | "tasks[\($i)]: missing required field \"\($k)\"" ),
            ( ($t | keys[]) as $k
              | select((task_fields | index($k)) == null)
              | "tasks[\($i)]: unknown field \"\($k)\"" ),
            ( if ($t.id | is_id | not) then "tasks[\($i)]: id must match TASK-### (three or more digits)" else empty end ),
            ( if ($t.title | nonempty_str | not) then "tasks[\($i)]: title must be a non-empty string" else empty end ),
            ( if ($t.description | nonempty_str | not) then "tasks[\($i)]: description must be a non-empty string" else empty end ),
            ( if ($t.branchName | nonempty_str | not) then "tasks[\($i)]: branchName must be a non-empty string" else empty end ),
            ( if ($t.priority | is_pos_int | not) then "tasks[\($i)]: priority must be an integer >= 1" else empty end ),
            ( if ($t.dependsOn | type) != "array" then "tasks[\($i)]: dependsOn must be an array" else empty end ),
            ( if ($t.dependsOn | type) == "array" and (($t.dependsOn | length) != ($t.dependsOn | unique | length)) then "tasks[\($i)]: dependsOn must not contain duplicates" else empty end ),
            ( if ($t.dependsOn | type) == "array" then
                ( $t.dependsOn[] as $d | select($d | is_id | not)
                  | "tasks[\($i)]: dependsOn entry \"\($d)\" must match TASK-###" )
              else empty end ),
            ( if ($t.acceptanceCriteria | type) != "array" then "tasks[\($i)]: acceptanceCriteria must be an array" else empty end ),
            ( if ($t.acceptanceCriteria | type) == "array" and ($t.acceptanceCriteria | length) == 0 then "tasks[\($i)]: acceptanceCriteria must contain at least one item" else empty end ),
            ( if ($t.acceptanceCriteria | type) == "array" then
                ( $t.acceptanceCriteria[] as $c | select($c | nonempty_str | not)
                  | "tasks[\($i)]: acceptanceCriteria items must be non-empty strings" )
              else empty end ),
            ( if ($t.passes | type) != "boolean" then "tasks[\($i)]: passes must be a boolean" else empty end ),
            ( if ($t.notes | type) != "string" then "tasks[\($i)]: notes must be a string" else empty end )
          end
      else empty end ),

    ( if ($root.tasks | type) == "array" then
        ( $root.tasks | map(select((. | type) == "object" and (.id | type) == "string") | .id) ) as $ids
        | ( $ids | group_by(.)[] | select(length > 1) | "tasks: duplicate id \"\(.[0])\"" )
      else empty end ),

    ( if ($root.tasks | type) == "array" then
        ( $root.tasks | map(select((. | type) == "object" and (.id | type) == "string") | .id) ) as $ids
        | $root.tasks[]
        | select((. | type) == "object" and (.id | type) == "string")
        | . as $t
        | select(($t.dependsOn | type) == "array")
        | $t.dependsOn[] as $d
        | select(($ids | index($d)) == null)
        | "tasks: \($t.id) dependsOn unknown task \"\($d)\""
      else empty end ),

    ( if ($root.tasks | type) == "array" then
        ( $root.tasks
          | map(select((. | type) == "object" and (.id | type) == "string"))
          | map({ key: .id, value: (if (.dependsOn | type) == "array" then .dependsOn else [] end) })
          | from_entries ) as $g
        | (cycle_nodes($g) | unique)[] as $node
        | "tasks: \($node) is part of a dependency cycle"
      else empty end )
  ]
| .[]
'

problems="$(jq -r "$JQ_PROGRAM" "$PRD_PATH")"

if [[ -n "$problems" ]]; then
  printf 'validate-prd: %s does not match prd.schema.json:\n' "$PRD_PATH" >&2
  while IFS= read -r problem; do
    [[ -n "$problem" ]] && printf '  - %s\n' "$problem" >&2
  done <<< "$problems"
  exit 1
fi

printf 'validate-prd: %s OK (%s task(s))\n' "$PRD_PATH" "$(jq '.tasks | length' "$PRD_PATH")"
