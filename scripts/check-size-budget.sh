#!/usr/bin/env bash
# Fail if built package artifacts exceed size budgets (bytes).
# Sourcemaps are excluded — consumers rarely ship them.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LIB="${ROOT}/lib"

# ~30% headroom over current (≈53 KB JS / ≈67 KB DTS) to catch regressions
# without blocking small legitimate growth.
MAX_JS_BYTES="${SIZE_BUDGET_JS_BYTES:-70000}"
MAX_MJS_BYTES="${SIZE_BUDGET_MJS_BYTES:-70000}"
MAX_DTS_BYTES="${SIZE_BUDGET_DTS_BYTES:-90000}"

fail=0

check() {
  local path="$1"
  local max="$2"
  local label="$3"

  if [[ ! -f "${path}" ]]; then
    echo "size budget: missing ${label} (${path})" >&2
    fail=1
    return
  fi

  local bytes
  bytes="$(wc -c <"${path}" | tr -d ' ')"
  if (( bytes > max )); then
    echo "size budget: ${label} is ${bytes} bytes (max ${max})" >&2
    fail=1
    return
  fi

  echo "size budget: ${label} ${bytes}/${max} bytes OK"
}

check "${LIB}/index.js" "${MAX_JS_BYTES}" "lib/index.js (cjs)"
check "${LIB}/index.mjs" "${MAX_MJS_BYTES}" "lib/index.mjs (esm)"
check "${LIB}/index.d.ts" "${MAX_DTS_BYTES}" "lib/index.d.ts"

if (( fail != 0 )); then
  exit 1
fi
