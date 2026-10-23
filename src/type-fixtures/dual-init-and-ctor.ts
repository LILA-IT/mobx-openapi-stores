import { ApiStore } from '../stores/ApiStore';
import { CollectionStore } from '../stores/CollectionStore';
import { CrudCollectionStore } from '../stores/CrudCollectionStore';
import { ObjectStore } from '../stores/ObjectStore';
import { SingleStore } from '../stores/SingleStore';
import type { Configuration } from '../openapi-generator';
import type { ApiType } from '../types';
import type { PetApi } from './generated-shaped/pet-api';

type PetClient = PetApi & ApiType;

function createPetClient(_config: Configuration): PetClient {
  return {
    initApi: () => undefined,
    listPets: () => Promise.resolve([]),
    getPet: () => Promise.resolve({ id: '1', name: 'x' }),
  };
}

/**
 * Both init paths must remain type-correct (createApi ctor option + subclass initApi).
 */
export const petStoreViaCreateApi = new ApiStore<PetClient, Configuration>({
  name: 'PetViaCreateApi',
  createApi: (config) => createPetClient(config),
});

export class PetStoreViaInitApi extends ApiStore<PetClient> {
  constructor() {
    super('PetViaInitApi');
  }

  initApi(config: Configuration): void {
    this.setApi(createPetClient(config));
  }
}

// Dual ctor forms
export const namedWithString = new ApiStore<PetClient>('StringCtor');
export const namedWithOptions = new ApiStore<PetClient>({ name: 'OptionsCtor' });

export const singleStoreWithConfig = new SingleStore<
  PetClient,
  { id: string; name: string },
  Configuration
>({ createApi: createPetClient });
export const collectionStoreWithConfig = new CollectionStore<
  PetClient,
  { id: string; name: string },
  { id: string; name: string }[],
  Configuration
>({ createApi: createPetClient });
export const objectStoreWithConfig = new ObjectStore<
  PetClient,
  string,
  { id: string; name: string },
  'single',
  Record<string, { id: string; name: string }>,
  Configuration
>({ createApi: createPetClient });
export const crudStoreWithConfig = new CrudCollectionStore<
  PetClient,
  { id: string; name: string },
  { id: string; name: string }[],
  Configuration
>({ createApi: createPetClient });
