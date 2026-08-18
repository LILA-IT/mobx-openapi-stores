import { ApiStore } from './ApiStore';
import { CollectionStore } from './CollectionStore';
import { CrudCollectionStore } from './CrudCollectionStore';
import { LoadingStore } from './LoadingStore';
import { ObjectStore } from './ObjectStore';
import { PaginationStore } from './PaginationStore';
import { SingleStore } from './SingleStore';

export type { ApiCallOptions } from './ApiStore';
export type { CrudFetchOptions } from './CrudCollectionStore';
export type {
  FetchPageOptions,
  FetchPageParams,
  FetchPagesApiOptions,
  MultiPageResponse,
  PaginatedPage,
  PaginationInner,
  PaginationOuter,
  PaginationState,
} from './PaginationStore';

export {
  ApiStore,
  LoadingStore,
  CollectionStore,
  CrudCollectionStore,
  SingleStore,
  ObjectStore,
  PaginationStore,
};

export { DEFAULT_LOADING_KEY, type LoadingTicket } from './LoadingStore';
