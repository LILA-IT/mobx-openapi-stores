#!/usr/bin/env bash
# Mirror the current tree to GitHub without uploading private git history.
#
# Strategy:
# - Never push GitLab commits/ancestors (they may contain scrubbed host URLs).
# - Create a GitHub commit whose tree matches the synced ref, parented on
#   github/main.
# - Scrub private host URLs (e.g. changelog commit links) to the public GitHub
#   repo before publishing the tree.
# - Recreate missing v* tags on GitHub against that scrubbed tree so npm
#   trusted publishing can run.
set -euo pipefail

GITHUB_REPO="${GITHUB_REPO:-LILA-IT/mobx-openapi-stores}"

if [[ -z "${GH_TOKEN:-}" ]]; then
  echo "GH_TOKEN is required" >&2
  exit 1
fi

# Avoid printing the token via `set -x` or remote -v in logs.
GITHUB_REMOTE_URL="https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPO}.git"

# Patterns are base64-encoded so this script does not embed private host names
# as searchable literals in the public mirror tree.
LEAK_REGEX="$(printf '%s' 'Z2l0bGFiXC5jc2Nsb3VkfGNzY2xvdWRcLmlv' | base64 -d)"
# gitlab.cscloud.io/lila/packages/mobx-openapi-stores
PRIVATE_PROJECT_PATH="$(printf '%s' 'Z2l0bGFiLmNzY2xvdWQuaW8vbGlsYS9wYWNrYWdlcy9tb2J4LW9wZW5hcGktc3RvcmVz' | base64 -d)"
PUBLIC_PROJECT_PATH="github.com/${GITHUB_REPO}"

git config user.name "${GIT_AUTHOR_NAME:-github-mirror[bot]}"
git config user.email "${GIT_AUTHOR_EMAIL:-github-mirror[bot]@users.noreply.github.com}"

git remote remove github 2>/dev/null || true
git remote add github "$GITHUB_REMOTE_URL"

git fetch github main:refs/remotes/github/main || true
git fetch github --tags || true

ensure_mirror_commit() {
  local tree="$1"
  local message="$2"
  local parent
  parent="$(git rev-parse refs/remotes/github/main 2>/dev/null || true)"

  if [[ -n "${parent}" ]]; then
    local parent_tree
    parent_tree="$(git rev-parse "${parent}^{tree}")"
    if [[ "${parent_tree}" == "${tree}" ]]; then
      echo "${parent}"
      return
    fi
    git commit-tree "${tree}" -p "${parent}" -m "${message}"
    return
  fi

  git commit-tree "${tree}" -m "${message}"
}

scrub_private_hosts_in_index() {
  local tmp_index="$1"
  local path mode blob content scrubbed new_blob

  while IFS= read -r path; do
    [[ -z "${path}" ]] && continue
    mode="$(GIT_INDEX_FILE="${tmp_index}" git ls-files --stage -- "${path}" | awk '{print $1}')"
    content="$(GIT_INDEX_FILE="${tmp_index}" git cat-file -p ":${path}")"
    scrubbed="$(printf '%s' "${content}" | sed "s|${PRIVATE_PROJECT_PATH}|${PUBLIC_PROJECT_PATH}|g")"
    if printf '%s' "${scrubbed}" | grep -qEi "${LEAK_REGEX}"; then
      echo "Unable to scrub private host references from ${path}" >&2
      return 1
    fi
    new_blob="$(printf '%s' "${scrubbed}" | git hash-object -w --stdin)"
    GIT_INDEX_FILE="${tmp_index}" git update-index --cacheinfo "${mode},${new_blob},${path}"
    echo "Scrubbed private host references in ${path}" >&2
  done < <(
    GIT_INDEX_FILE="${tmp_index}" git grep -lEi --cached "${LEAK_REGEX}" -- . \
      ':(exclude)scripts/sync-github.sh' || true
  )
}

public_tree_from_ref() {
  local ref="$1"
  local tmp_index tree
  tmp_index="$(mktemp)"
  GIT_INDEX_FILE="${tmp_index}" git read-tree "${ref}"
  # Internal CI config and local yarn state are not part of the public mirror.
  GIT_INDEX_FILE="${tmp_index}" git rm -f --cached --ignore-unmatch \
    .gitlab-ci.yml \
    .yarn/install-state.gz \
    sonar-project.properties >/dev/null
  scrub_private_hosts_in_index "${tmp_index}"
  tree="$(GIT_INDEX_FILE="${tmp_index}" git write-tree)"
  rm -f "${tmp_index}"

  if git grep -nEi "${LEAK_REGEX}" "${tree}" -- . ':(exclude)scripts/sync-github.sh'; then
    echo "Refusing to mirror: private host reference remains in public tree" >&2
    return 1
  fi

  printf '%s\n' "${tree}"
}

push_main_tree() {
  local tree short_sha mirror_commit
  tree="$(public_tree_from_ref HEAD)"
  short_sha="$(git rev-parse --short HEAD)"
  mirror_commit="$(ensure_mirror_commit "${tree}" "chore(mirror): sync ${short_sha}")"
  echo "Pushing GitHub main -> ${mirror_commit}"
  git push github "${mirror_commit}:refs/heads/main"
  git fetch github main:refs/remotes/github/main
}

tag_exists_on_github() {
  local tag="$1"
  git ls-remote --exit-code --tags github "refs/tags/${tag}" >/dev/null 2>&1
}

push_missing_version_tags() {
  local tag tag_tree mirror_commit
  while IFS= read -r tag; do
    [[ -z "${tag}" ]] && continue
    if tag_exists_on_github "${tag}"; then
      echo "Tag ${tag} already on GitHub; skipping"
      continue
    fi

    tag_tree="$(public_tree_from_ref "${tag}")"
    mirror_commit="$(ensure_mirror_commit "${tag_tree}" "chore(mirror): ${tag}")"
    echo "Pushing tag ${tag} -> ${mirror_commit}"
    git push github "${mirror_commit}:refs/heads/main"
    git fetch github main:refs/remotes/github/main
    git push github "${mirror_commit}:refs/tags/${tag}"
  done < <(git tag --list 'v*' | sort -V)
}

push_main_tree
push_missing_version_tags

echo "GitHub sync complete."
