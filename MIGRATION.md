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

## 2.0.1 behaviour fix

- `CollectionStore.editItem` (and so `CrudCollectionStore` updates) now merges
  the update into `current` when `current.id` matches, like `PaginationStore`
  already did. In 2.0.0 `current` was replaced, so a partial update response
  dropped fields from `current` while the collection entry kept them. A
  different-ID update is still selected as `current` when `setCurrent` is true.
  Tests that pin the replace behaviour need updating.

# Stale and aborted requests (opt-in)

New in the 2.x minor after 2.0.1; nothing changes unless you opt in.

- `apiCall` takes `signal` (forwarded to the endpoint as `{ signal }`), `isStale(error)`
  and `staleResult: 'marker'`. Without `staleResult`, a superseded or aborted call
  settles as in 2.0 (a success resolves with its unapplied response, a failure
  rejects), but it no longer logs through `handleError`.
- With `staleResult: 'marker'`, a stale call resolves with a `StaleResult` (check it
  with `isStaleResult`) and never rejects; the result type includes `StaleResult`.
- `isAbortError(error)` walks the `cause` chain of errors wrapped by `handleError`.
- `beginExclusiveCall(key)` returns a generation for `isApiCallCurrent(key, generation)`.
- `PaginationStore.fetchPage` is now last-call-wins: a superseded call resolves
  `undefined` and applies nothing. A failed background prefetch is logged with
  `console.warn` instead of an unhandled rejection.

Local workarounds you can drop:

- a request counter that ignores late responses: use `exclusiveKey` (with
  `staleResult: 'marker'` if the caller must know), or rely on `fetchPage`;
- walking the `cause` chain to recognise aborted or session-ended requests: pass
  `isStale` once in your typed `call` wrapper (for example
  `isStale: isSessionEndedError`) together with `staleResult: 'marker'`, or use
  `isAbortError`.
