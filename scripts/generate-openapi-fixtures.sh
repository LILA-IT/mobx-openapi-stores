#!/usr/bin/env bash
# Generate typescript-fetch clients from fixtures/openapi/mini-api.yaml.
# OPENAPI_GENERATOR_VERSION: JAR semver (default 7.20.0) or "latest".
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FIX="${ROOT}/fixtures/openapi"
OUT="${FIX}/.generated"
VERSION="${OPENAPI_GENERATOR_VERSION:-7.20.0}"
CONFIG="${FIX}/openapitools.json"
BACKUP="$(mktemp)"

cp "${CONFIG}" "${BACKUP}"
cleanup() {
  cp "${BACKUP}" "${CONFIG}"
  rm -f "${BACKUP}"
}
trap cleanup EXIT

cd "${FIX}"

# CI SSRF / path hardening: only local mini-api.yaml, no remote refs.
node --input-type=module <<'EOF'
import { readFileSync } from 'node:fs'

const config = JSON.parse(readFileSync('openapitools.json', 'utf8'))
const generators = config['generator-cli']?.generators ?? {}
for (const [key, gen] of Object.entries(generators)) {
  const g = /** @type {{ inputSpec?: string; output?: string }} */ (gen)
  if (g.inputSpec !== './mini-api.yaml') {
    console.error(
      `Refusing generator "${key}" inputSpec="${String(g.inputSpec)}" (must be ./mini-api.yaml)`,
    )
    process.exit(1)
  }
  if (g.output !== './.generated') {
    console.error(
      `Refusing generator "${key}" output="${String(g.output)}" (must be ./.generated)`,
    )
    process.exit(1)
  }
}

const yaml = readFileSync('mini-api.yaml', 'utf8')
if (/\$ref\s*:\s*['"]?(https?:|file:|\/\/)/i.test(yaml)) {
  console.error('Refusing mini-api.yaml: external $ref URLs are not allowed')
  process.exit(1)
}
EOF

# Writing the literal "latest" into openapitools.json does not resolve a Maven
# artifact. Use version-manager so the advisory CI job gets a real semver.
if [[ "${VERSION}" == "latest" ]]; then
  echo "Resolving openapi-generator-cli latest tag..."
  yarn exec openapi-generator-cli version-manager set latest
  VERSION="$(
    node --input-type=module <<'EOF'
import { readFileSync } from 'node:fs'
const version = JSON.parse(readFileSync('openapitools.json', 'utf8'))['generator-cli']
  ?.version
if (typeof version !== 'string' || version === 'latest' || !/^\d+\.\d+\.\d+/.test(version)) {
  console.error(`version-manager did not resolve a semver (got ${String(version)})`)
  process.exit(1)
}
process.stdout.write(version)
EOF
  )"
  echo "Resolved latest -> ${VERSION}"
else
  OPENAPI_GENERATOR_VERSION="${VERSION}" node --input-type=module <<'EOF'
import { readFileSync, writeFileSync } from 'node:fs'
const path = 'openapitools.json'
const json = JSON.parse(readFileSync(path, 'utf8'))
json['generator-cli'].version = process.env.OPENAPI_GENERATOR_VERSION || '7.20.0'
writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`)
EOF
fi

rm -rf "${OUT}"
echo "Generating OpenAPI typescript-fetch with generator-cli ${VERSION}..."
yarn exec openapi-generator-cli generate \
  --generator-key typescript-fetch-fixture

echo "Generated into ${OUT}"
