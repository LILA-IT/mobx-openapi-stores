import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const expectedExports = [
  'ApiStore',
  'CollectionStore',
  'CrudCollectionStore',
  'DEFAULT_LOADING_KEY',
  'LoadingStore',
  'ObjectStore',
  'PaginationStore',
  'SingleStore',
  'callApi',
  'getErrorMessage',
  'handleError',
  'toFlowGeneratorFunction',
].sort();

const root = resolve(import.meta.dirname, '..');
const esmEntry = pathToFileURL(resolve(root, 'lib/index.mjs')).href;
const cjsEntry = resolve(root, 'lib/index.cjs');

const esmExports = Object.keys(await import(esmEntry)).sort();
const require = createRequire(import.meta.url);
const cjsExports = Object.keys(require(cjsEntry)).sort();

assert.deepEqual(esmExports, expectedExports, 'ESM entry point exports changed');
assert.deepEqual(cjsExports, expectedExports, 'CommonJS entry point exports changed');

assert.equal(expectedExports.length, 12);
