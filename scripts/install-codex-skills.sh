#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
SOURCE_ROOT="${REPO_ROOT}/.codex/skills"
DEST_ROOT="${CODEX_SKILLS_HOME:-${HOME}/.codex/skills}"
SKILLS=(
  aws-aidlc-inception
  aws-aidlc-construction
)

install_skill() {
  local skill_name="$1"
  local source_path="${SOURCE_ROOT}/${skill_name}"
  local dest_path="${DEST_ROOT}/${skill_name}"

  if [[ ! -d "${source_path}" ]]; then
    printf 'Missing source skill directory: %s\n' "${source_path}" >&2
    exit 1
  fi

  if [[ -L "${dest_path}" ]]; then
    local current_target
    current_target="$(readlink "${dest_path}")"

    if [[ "${current_target}" == "${source_path}" ]]; then
      printf 'Already linked: %s -> %s\n' "${dest_path}" "${source_path}"
      return
    fi

    printf 'Refusing to replace existing symlink: %s -> %s\n' "${dest_path}" "${current_target}" >&2
    exit 1
  fi

  if [[ -e "${dest_path}" ]]; then
    printf 'Refusing to replace existing path: %s\n' "${dest_path}" >&2
    exit 1
  fi

  ln -s "${source_path}" "${dest_path}"
  printf 'Linked: %s -> %s\n' "${dest_path}" "${source_path}"
}

mkdir -p "${DEST_ROOT}"

for skill_name in "${SKILLS[@]}"; do
  install_skill "${skill_name}"
done

printf 'Restart Codex to pick up the new skills.\n'
