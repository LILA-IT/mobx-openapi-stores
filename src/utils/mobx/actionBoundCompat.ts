import * as MobX from 'mobx';

type ActionAnnotation = typeof MobX.action;

type MobXWithBoundExports = typeof MobX & {
  actionBound?: ActionAnnotation;
};

type ActionWithBound = ActionAnnotation & {
  bound?: ActionAnnotation;
};

/**
 * Bound-action annotation for `makeObservable` / `makeAutoObservable`.
 *
 * MobX docs recommend binding prototype actions when they may be passed as
 * callbacks (`store.initApi` without calling through the instance), so `this`
 * stays correct. Prefer this over plain `action`.
 *
 * - MobX 6: `action.bound`
 * - MobX 7: `actionBound` (namespaced annotation APIs were removed for tree-shaking)
 *
 * @see https://mobx.js.org/actions.html#actionbound
 * @see https://mobx.js.org/migrating-from-6-to-7.html#replacing-namespaced-apis
 */
export const actionBoundCompat: ActionAnnotation = resolveActionBound();

function resolveActionBound(): ActionAnnotation {
  const mobx = MobX as MobXWithBoundExports;
  if (typeof mobx.actionBound === 'function') {
    return mobx.actionBound;
  }

  const legacyBound = (mobx.action as ActionWithBound).bound;
  if (typeof legacyBound === 'function') {
    return legacyBound;
  }

  throw new Error(
    'mobx-openapi-stores: neither actionBound (MobX 7+) nor action.bound (MobX 6) is available',
  );
}
