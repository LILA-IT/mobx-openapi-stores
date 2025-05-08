/**
 * @typedef SingleType
 * @description Represents the basic structure of an entity managed by SingleStore or CollectionStore,
 * requiring at least an `id` property.
 * @property {number | string} id - A unique identifier for the entity.
 */
export type SingleType = { id: number | string };
