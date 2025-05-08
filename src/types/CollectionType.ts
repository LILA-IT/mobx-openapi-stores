import { type SingleType } from './SingleType';

/**
 * @typedef CollectionType
 * @template TSingle - The type of individual items in the collection, conforming to `SingleType`.
 * @description Represents an array of entities, where each entity is at least a partial `TSingle` with an `id`.
 *              Defaults to `TSingle[]` if TSingle is a full object, but allows for collections of partial objects.
 */
export type CollectionType<TSingle extends SingleType = SingleType> =
  (Partial<TSingle> & { id: number | string })[];
