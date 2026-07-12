#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
skill_dir="$(cd -- "$script_dir/.." && pwd -P)"
skills_dir="${LARK_SKILLS_DIR:-$(cd -- "$skill_dir/.." && pwd -P)}"

case "$skills_dir" in
  "" | /)
    printf 'error: refusing unsafe skills directory: %q\n' "$skills_dir" >&2
    exit 2
    ;;
esac

removed=0
shopt -s nullglob
for candidate in "$skills_dir"/lark-*; do
  # Preserve this skill even if an installer chose a lark-* directory name.
  if [[ "$candidate" == "$skill_dir" ]]; then
    continue
  fi

  printf 'Removing separate Lark skill: %s\n' "$candidate" >&2
  rm -rf -- "$candidate"
  removed=$((removed + 1))
done
shopt -u nullglob

printf 'Lark skills compacted: removed %d separate skill(s); kept %s\n' \
  "$removed" "$skill_dir" >&2
