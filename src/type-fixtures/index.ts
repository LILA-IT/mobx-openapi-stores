/**
 * Compile-only TypeScript fixtures for multi-store / generated-API contracts.
 * Included by root `tsconfig.json` (`src/**`). Not executed by Vitest.
 *
 * Covers:
 * - endpoint isolation across two generated-shaped API clients / stores
 * - nominative vs structural Configuration (generator private-field classes)
 * - dual init (`createApi` + `initApi`) and dual ctor forms
 * - ObjectStore `'single'` | `'collection'` modes
 */
export type { MultiStoreEndpointFixture } from './generated-shaped/endpoint-isolation';
export type { StructuralConfigFixture } from './generated-shaped/structural-configuration';
export { multiStoreEndpointCalls } from './multi-store-endpoint-calls';
export { objectStoreModeCalls } from './object-store-modes';
