import { describe, expect, it } from 'vitest';

import { CollectionStore } from '../CollectionStore';
import type { ApiType } from 'src/types';

type SampleType = {
  id: number;
  name: string;
  tags:
    | []
    | {
        id: number;
        name: string;
        color: {
          id: number;
          name: string;
        }[];
      }[];
  user: {
    id: number;
    name: string;
    street: string;
    city: string;
    zip: string;
  };
};

const SAMPLE_DATA: SampleType[] = [
  {
    id: 1,
    name: 'Test 1',
    tags: [],
    user: {
      id: 1,
      name: 'User 1',
      street: 'Street 1',
      city: 'City 1',
      zip: 'Zip 1',
    },
  },
  {
    id: 2,
    name: 'Test 2',
    tags: [
      {
        id: 1,
        name: 'Tag 1',
        color: [
          {
            id: 1,
            name: 'Color 1',
          },
        ],
      },
    ],
    user: {
      id: 2,
      name: 'User 2',
      street: 'Street 2',
      city: 'City 2',
      zip: 'Zip 2',
    },
  },
  {
    id: 3,
    name: 'Test 3',
    tags: [
      {
        id: 1,
        name: 'Tag 1',
        color: [
          {
            id: 1,
            name: 'Color 1',
          },
        ],
      },
      {
        id: 2,
        name: 'Tag 2',
        color: [
          {
            id: 2,
            name: 'Color 2',
          },
        ],
      },
    ],
    user: {
      id: 3,
      name: 'User 3',
      street: 'Street 3',
      city: 'City 3',
      zip: 'Zip 3',
    },
  },
];

describe('CollectionStore', () => {
  it('should be defined', () => {
    expect(CollectionStore).toBeDefined();
  });

  it('should be a class', () => {
    expect(typeof CollectionStore).toBe('function');
  });

  it('should have a constructor', () => {
    expect(CollectionStore.prototype.constructor).toBeDefined();
  });

  const store = new CollectionStore<ApiType, SampleType>({
    name: 'TestStore',
    apiConstructor: (config) => {
      return {
        configuration: config,
      } as unknown as ApiType;
    },
  });

  it('should have a name', () => {
    expect(store.name).toBe('TestStore');
  });

  it('should have a collection', () => {
    expect(store.collection).toEqual([]);
  });

  it("should set the collection's data", () => {
    store.setCollection(SAMPLE_DATA);
    expect(store.collection).toEqual(SAMPLE_DATA);
  });

  it("should add an item to the collection's data", () => {
    const newItem = {
      id: 4,
      name: 'Test 4',
      tags: [],
      user: {
        id: 4,
        name: 'User 4',
        street: 'Street 4',
        city: 'City 4',
        zip: 'Zip 4',
      },
    };
    store.addItem(newItem);
    expect(store.collection).toEqual([...SAMPLE_DATA, { ...newItem }]);
  });

  it("should delete an item from the collection's data", () => {
    store.removeItem(4);
    expect(store.collection).toEqual([...SAMPLE_DATA]);
  });

  it("should update an item in the collection's data", () => {
    const updatedItem = {
      id: 3,
      name: 'Test 3 Updated',
      tags: [],
      user: {
        id: 3,
        name: 'User 3 Updated',
        street: 'Street 3 Updated',
        city: 'City 3 Updated',
        zip: 'Zip 3 Updated',
      },
    };
    store.editItem(updatedItem);
    expect(store.collection).toEqual([
      SAMPLE_DATA[0],
      SAMPLE_DATA[1],
      { ...updatedItem },
    ]);
  });
});
