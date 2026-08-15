#!/usr/bin/env bash
# Mirror the current tree to GitHub without uploading private git history.
#
# Strategy:
# - Never push GitLab commits/ancestors (they may contain scrubbed host URLs).
# - Create a GitHub commit whose tree matches the synced ref, parented on
#   github/main.
# - Recreate missing v* tags on GitHub against a commit with the same tree as
#   the internal tag (so GitHub Actions trusted publishing can run).
set -euo pipefail

GITHUB_REPO="${GITHUB_REPO:-LILA-IT/mobx-openapi-stores}"

if [[ -z "${GH_TOKEN:-}" ]]; then
  echo "GH_TOKEN is required" >&2
  exit 1
fi

# Avoid printing the token via `set -x` or remote -v in logs.
GITHUB_REMOTE_URL="https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPO}.git"

# Pattern is base64-encoded so this script itself does not embed private host
# names as searchable literals in the public mirror tree.
LEAK_REGEX="$(printf '%s' 'Z2l0bGFiXC5jc2Nsb3VkfGNzY2xvdWRcLmlv' | base64 -d)"

echo "Checking HEAD tree for private host references..."
if git grep -nEi "${LEAK_REGEX}" HEAD -- . ':(exclude)scripts/sync-github.sh'; then
  echo "Refusing to mirror: private host reference present in HEAD tree" >&2
  exit 1
fi

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
  tree="$(GIT_INDEX_FILE="${tmp_index}" git write-tree)"
  rm -f "${tmp_index}"
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
    if git grep -nEi "${LEAK_REGEX}" "${tag_tree}" -- . ':(exclude)scripts/sync-github.sh'; then
      echo "Refusing to mirror tag ${tag}: private host reference in public tree" >&2
      exit 1
    fi

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
