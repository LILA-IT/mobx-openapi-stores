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