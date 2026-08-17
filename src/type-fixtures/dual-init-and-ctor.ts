import { ApiStore } from '../stores/ApiStore';
import type { Configuration } from '../openapi-generator';
import type { ApiType } from '../types';
import type { PetApi } from './generated-shaped/pet-api';

type PetClient = PetApi & ApiType;

function createPetClient(_config: Configuration): PetClient {
  return {
    initApi: () => undefined,
    listPets: () => Promise.resolve([]),
    getPet: () => Promise.resolve({ id: '1', name: 'x' }),
  } as unknown as PetClient;
}

/**
 * Both init paths must remain type-correct (createApi ctor option + subclass initApi).
 */
export const petStoreViaCreateApi = new ApiStore<PetClient>({
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
