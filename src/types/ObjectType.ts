import { type SingleType } from './SingleType';

/** Keyed entity shape used by `ObjectStore`; mode selects one entity or an array. */
export type ObjectType<
  TKey extends SingleType['id'] = SingleType['id'],
  TTarget extends SingleType = SingleType,
  TType extends 'single' | 'collection' = 'single',
> = Record<TKey, TType extends 'single' ? TTarget : TTarget[]>;
