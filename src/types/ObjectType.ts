import { type SingleType } from './SingleType';

/**
 * @typedef ObjectType
 * @template TKey - The type of keys in the observable object (e.g., string IDs).
 * @template TTarget - The type of items stored within the object's entries (must conform to `SingleType`).
 * @template TType - A literal type indicating if entries are single items ('single') or collections ('collection').
 * @description Describes the shape of the observable object managed by `ObjectStore`.
 *              It's a record where each key maps to either a single `TTarget` item or an array `TTarget[]`,
 *              depending on the `TType` generic.
 * @example
 * // Example: Grouping tasks by project ID, where each project has a collection of tasks
 * type ProjectTaskMap = ObjectType<string, Task, 'collection'>;
 * // { [projectId: string]: Task[] }
 *
 * // Example: Mapping user IDs to their single profile object
 * type UserProfileMap = ObjectType<string, UserProfile, 'single'>;
 * // { [userId: string]: UserProfile }
 */
export type ObjectType<
  TKey extends SingleType['id'] = SingleType['id'],
  TTarget extends SingleType = SingleType,
  TType extends 'single' | 'collection' = 'single',
> = Record<TKey, TType extends 'single' ? TTarget : TTarget[]>;
