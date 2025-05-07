import {
  action,
  computed,
  entries,
  get,
  has,
  makeObservable,
  observable,
  remove,
  set,
  values,
} from 'mobx';

import { type ApiType } from '../types/ApiType';
import { SingleStore, type SingleType } from './SingleStore';
import find from 'lodash/find';
import flatMap from 'lodash/flatMap';
import _remove from 'lodash/remove';
type PartialSingleType<T extends SingleType> = Partial<T> & {
  id: number | string;
};

export type ObjectType<
  TKey extends SingleType['id'] = SingleType['id'],
  TTarget extends SingleType = SingleType,
  TType extends 'single' | 'collection' = 'single',
> = Record<TKey, TType extends 'single' ? TTarget : TTarget[]>;

export class ObjectStore<
  TApi extends ApiType,
  TKey extends SingleType['id'],
  TTarget extends SingleType = SingleType,
  TType extends 'collection' = 'collection',
  TObject extends ObjectType<TKey, TTarget, TType> = ObjectType<
    TKey,
    TTarget,
    TType
  >,
> extends SingleStore<TApi, TTarget> {
  _object = observable.object<TObject>({} as TObject);

  constructor(name: string) {
    super(name);
    makeObservable(this, {
      _object: observable,
      object: computed,
      getEntryById: false,
      getById: false,
      setEntry: action,
      removeEntry: action,
      entryIsSet: false,
      addItem: action,
      editItem: action,
      removeItem: action,
      getEntryIdByItemId: false,
      getItemById: false,
    });
  }

  get object() {
    return this._object;
  }

  getEntryById(id: keyof TObject): TObject[TKey] | undefined {
    // @ts-expect-error mobx types are not correct
    return get(this._object, id);
  }

  getById(id: TKey): TObject[TKey] | undefined {
    return this.getEntryById(id);
  }

  setEntry(id: keyof TObject | TKey, item: TObject[TKey]): void {
    set(this._object, String(id), item);
  }

  removeEntry(id: TKey): void {
    remove(this._object, String(id));
  }

  entryIsSet(id: TKey): boolean {
    return has(this._object, String(id));
  }

  getEntryIdByItemId(itemId: TTarget['id']): keyof TObject | undefined {
    const e = entries(this._object);
    if (e.length > 0 && Array.isArray(e[0][1])) {
      const foundEntry = e.find(([id, entry]) =>
        entry.some((item) => item.id === itemId),
      );
      if (foundEntry) {
        return foundEntry[0] as keyof TObject;
      }
    }
    return undefined;
  }

  getItemById(itemId: TTarget['id']): TTarget | undefined {
    return find(
      flatMap(values(this._object), (entry) => entry),
      (item) => item.id === itemId,
    );
  }

  addItem(entryId: TKey, item: TTarget): void {
    const items = this.getEntryById(entryId);
    if (Array.isArray(items)) {
      items.push(item);
      this.setEntry(entryId, items);
    }
  }

  editItem(itemId: TTarget['id'], item: TTarget): void {
    const entryId = this.getEntryIdByItemId(itemId);
    if (!entryId) return;
    const entry = this.getEntryById(entryId);
    if (!entry) return;
    const index = entry.findIndex((item) => item.id === itemId);
    if (index === -1) return;
    entry[index] = item;
    this.setEntry(entryId, entry);
  }

  removeItem(itemId: TTarget['id'], entryId?: keyof TObject): void {
    entryId ??= this.getEntryIdByItemId(itemId);
    if (!entryId) return;
    const entry = this.getEntryById(entryId);
    if (!entry) return;
    _remove(entry, (item) => item.id === itemId);
    this.setEntry(entryId, entry);
  }
}
