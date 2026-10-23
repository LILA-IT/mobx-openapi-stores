#!/usr/bin/env bash
# Fail if built package artifacts exceed size budgets (bytes).
# Sourcemaps are excluded — consumers rarely ship them.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LIB="${ROOT}/lib"

# Moderate headroom over current (≈53 KB CJS/ESM / ≈54 KB DTS) catches regressions
# without blocking small legitimate growth.
MAX_CJS_BYTES="${SIZE_BUDGET_CJS_BYTES:-70000}"
MAX_MJS_BYTES="${SIZE_BUDGET_MJS_BYTES:-70000}"
MAX_DTS_BYTES="${SIZE_BUDGET_DTS_BYTES:-65000}"

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

check "${LIB}/index.cjs" "${MAX_CJS_BYTES}" "lib/index.cjs (cjs)"
check "${LIB}/index.mjs" "${MAX_MJS_BYTES}" "lib/index.mjs (esm)"
check "${LIB}/index.d.ts" "${MAX_DTS_BYTES}" "lib/index.d.ts"

if (( fail != 0 )); then
  exit 1
fi
