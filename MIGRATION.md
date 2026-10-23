# Migrating from 1.x to 2.0

2.0 removes the vendored OpenAPI runtime and hides internal observable state.
Stores now depend only on the structural shape of your generated client.

## Type changes

- `ApiType` is no longer `BaseAPI & { initApi }` and no longer takes a generic
  parameter. Replace `ApiType<Configuration>` with `ApiType` (any object).
  Endpoints are still selected with `ApiMethodName<TApi>` (callable members only).
- `ApiConfig<TApi>` is now the structural `ApiConfiguration` (`object`). Pass your
  generated `Configuration` through the new optional `TConfig` store generic if
  you need it typed.
- The `Timestamp` and `LogStamp` type exports are removed. Define them locally.

## Runtime / subclass changes

- The internal `_loadingCounts` field is private (`#loadingCounts`). Use
  `isLoading`, `isLoadingFor(key)`, `beginLoading` and `endLoading`.
- `PaginationStore.__apiCall` is removed. Call `apiCall` directly; it is typed per
  endpoint, so wrapper overrides that existed to work around generics can go.
- Backing observables of the stores are no longer visible in declarations. Read
  state through `collection`, `current`, `object` and the documented methods.

## Packaging

- `require('mobx-openapi-stores')` now resolves to `lib/index.cjs`. In 1.0.x the
  CommonJS bundle was emitted as `lib/index.js` inside a `"type": "module"`
  package, so `require` returned no store exports.
- The `mobx` peer range is `^6.0.0 || ^7.0.0`.
