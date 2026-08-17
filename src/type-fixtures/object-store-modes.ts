import { ObjectStore } from '../stores/ObjectStore';
import type { ApiType } from '../types';
import type { ObjectType } from '../types/ObjectType';

type EmptyApi = ApiType;

type User = { id: string; name: string };
type Comment = { id: string; body: string };

/** Keyed object: one entity per key (ObjectType defaults to 'single'). */
type UserMap = ObjectType<string, User>;

/** Keyed collection: array per key. */
type CommentsByPost = ObjectType<string, Comment, 'collection'>;

export class UserByIdStore extends ObjectStore<
  EmptyApi,
  string,
  User,
  'single',
  UserMap
> {}

export class CommentsByPostStore extends ObjectStore<
  EmptyApi,
  string,
  Comment,
  'collection',
  CommentsByPost
> {}

declare const users: UserByIdStore;
declare const comments: CommentsByPostStore;

export function objectStoreModeCalls(): void {
  users.setEntry('u1', { id: 'u1', name: 'Ada' });
  comments.setEntry('post-1', [{ id: 'c1', body: 'hi' }]);

  // @ts-expect-error single mode entry is not an array
  users.setEntry('u2', [{ id: 'u2', name: 'bad' }]);

  // @ts-expect-error collection mode entry is not a bare object
  comments.setEntry('post-2', { id: 'c2', body: 'bad' });
}
