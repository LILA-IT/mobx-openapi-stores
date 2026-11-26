# [2.3.0](https://github.com/LILA-IT/mobx-openapi-stores/compare/v2.2.0...v2.3.0) (2026-11-26)


### Features

* **api:** configurable default error message ([18bd23a](https://github.com/LILA-IT/mobx-openapi-stores/commit/18bd23a30d6b0c2b654b06e661753f5f0505c413)), closes [#7](https://github.com/LILA-IT/mobx-openapi-stores/issues/7)

# [2.2.0](https://github.com/LILA-IT/mobx-openapi-stores/compare/v2.1.0...v2.2.0) (2026-11-26)


### Features

* **utils:** accept a configurable default message in handleError ([1fca4cf](https://github.com/LILA-IT/mobx-openapi-stores/commit/1fca4cfe16382e3e933863e095cfd685854808c8)), closes [#2](https://github.com/LILA-IT/mobx-openapi-stores/issues/2)

# [2.1.0](https://github.com/LILA-IT/mobx-openapi-stores/compare/v2.0.1...v2.1.0) (2026-11-26)


### Features

* **stores:** opt-in stale results for apiCall, last-call-wins fetchPage ([3219831](https://github.com/LILA-IT/mobx-openapi-stores/commit/32198313c2433b4036d095a0883231d8088cdb58)), closes [#4](https://github.com/LILA-IT/mobx-openapi-stores/issues/4) [#5](https://github.com/LILA-IT/mobx-openapi-stores/issues/5) [#6](https://github.com/LILA-IT/mobx-openapi-stores/issues/6)

## [2.0.1](https://github.com/LILA-IT/mobx-openapi-stores/compare/v2.0.0...v2.0.1) (2026-11-26)


### Bug Fixes

* **stores:** merge CollectionStore.editItem updates into current ([dbbfad1](https://github.com/LILA-IT/mobx-openapi-stores/commit/dbbfad15823f5a10a2b6a6a40bf2324cb2b95c71)), closes [#3](https://github.com/LILA-IT/mobx-openapi-stores/issues/3)

# [2.0.0](https://github.com/LILA-IT/mobx-openapi-stores/compare/v1.0.3...v2.0.0) (2026-10-23)


### Bug Fixes

* **ci:** lint absent generated fixtures safely ([f59c286](https://github.com/LILA-IT/mobx-openapi-stores/commit/f59c2866cdf9ea0c1370e9c865c83c95688082da))
* **package:** expose CommonJS runtime exports ([b9733e6](https://github.com/LILA-IT/mobx-openapi-stores/commit/b9733e6bae1b150861cfb8e15bc535213e02f3a6))
* **stores:** do not read overridable isLoading inside LoadingStore ([b2d0950](https://github.com/LILA-IT/mobx-openapi-stores/commit/b2d0950a8c551b03f93e230ac13e103782345b9b)), closes [#1](https://github.com/LILA-IT/mobx-openapi-stores/issues/1)
* **types:** preserve structural client behavior ([c62ba39](https://github.com/LILA-IT/mobx-openapi-stores/commit/c62ba39258ea820d25f9be93fbe423247b3e5791))
* **types:** propagate client configuration types ([19a68df](https://github.com/LILA-IT/mobx-openapi-stores/commit/19a68dfff88f9973b648ba799761f17ee8424eef))


### Documentation

* add 2.0 migration guide ([277b504](https://github.com/LILA-IT/mobx-openapi-stores/commit/277b5043c78cf4c2d39532803f0a1d3a371c4c25))


### BREAKING CHANGES

* ApiType no longer extends the vendored BaseAPI and takes no
generic parameter, ApiConfig is the structural ApiConfiguration, the Timestamp
and LogStamp type exports are removed, and the protected _loadingCounts and
PaginationStore.__apiCall members are gone. See MIGRATION.md.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>

## [1.0.3](https://github.com/LILA-IT/mobx-openapi-stores/compare/v1.0.2...v1.0.3) (2026-08-18)


### Bug Fixes

* **ci:** harden openapi generator fixture job ([ff56a66](https://github.com/LILA-IT/mobx-openapi-stores/commit/ff56a665e695c61f437087dd2d865d6fe673489c))

## [1.0.2](https://github.com/LILA-IT/mobx-openapi-stores/compare/v1.0.1...v1.0.2) (2026-08-16)

### Bug Fixes

- **stores:** invalidate loading tickets after absolute clear ([64f4eda](https://github.com/LILA-IT/mobx-openapi-stores/commit/64f4eda9bb765055defbd5dce0ab11f6fbdaa983))

## [1.0.1](https://github.com/LILA-IT/mobx-openapi-stores/compare/v1.0.0...v1.0.1) (2026-08-15)

### Bug Fixes

- **ci:** make GitHub mirror sync work for npm releases ([6caaeff](https://github.com/LILA-IT/mobx-openapi-stores/commit/6caaeff55c390cc0514caa9a7aa63dd44c020455))

# 1.0.0 (2026-08-15)

### Bug Fixes

- **ci:** run release and GitHub sync on web/api pipelines ([4f9a1cd](https://github.com/LILA-IT/mobx-openapi-stores/commit/4f9a1cd3fe48f4f3c3091deee014b1c8051d1dc1))
- **ci:** run semantic-release against GitLab, not the GitHub mirror ([7fb6ecd](https://github.com/LILA-IT/mobx-openapi-stores/commit/7fb6ecd58302f2b8029a9d53b4d22efca3bf9fb0))
- **ci:** unblock security templates and MobX 7 peer check ([3f8a4c6](https://github.com/LILA-IT/mobx-openapi-stores/commit/3f8a4c6991d59ab82cc929410dbb4cda1a735540))
- **mobx:** restore bound initApi via MobX 6/7 compat helper ([9a27e12](https://github.com/LILA-IT/mobx-openapi-stores/commit/9a27e12ce69206e6aab2d9266b53373dc56c442d))
- **stores:** address Wave B review findings on exclusive fetch ([6e1b4af](https://github.com/LILA-IT/mobx-openapi-stores/commit/6e1b4aff3465f46132acf2bc940dffb18a1af111))
- **stores:** refcount loading and ignore-stale apiCall apply ([a368976](https://github.com/LILA-IT/mobx-openapi-stores/commit/a368976eebe1a4941250aad837cd15d2afa0733f))
- **stores:** scope ignore-stale apply with exclusiveKey ([215e6e3](https://github.com/LILA-IT/mobx-openapi-stores/commit/215e6e3df9735de387285d5cf32f08fc4960cb03))

### Features

- modernize package with store patterns and GitLab tooling ([d942917](https://github.com/LILA-IT/mobx-openapi-stores/commit/d942917db2ce5c3ec47b4214651d2f993143233b))
- **stores:** add keyed loading via loadingKey and isLoadingFor ([283d65f](https://github.com/LILA-IT/mobx-openapi-stores/commit/283d65ff07eb2cd1c130245306d236283a22b865))

### Reverts

- keep lodash in CollectionStore; drop private OPTIMIZATION.md ([1cbf866](https://github.com/LILA-IT/mobx-openapi-stores/commit/1cbf866b562654d92c427e3e2c0cecb30ca5ed46))