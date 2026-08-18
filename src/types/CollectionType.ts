import { type SingleType } from './SingleType';

/** Entity collection whose partial entries always retain an ID. */
export type CollectionType<TSingle extends SingleType = SingleType> =
  (Partial<TSingle> & {
    id: number | string;
  })[];
