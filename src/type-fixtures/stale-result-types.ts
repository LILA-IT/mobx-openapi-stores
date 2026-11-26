import { isStaleResult } from '../utils/api/stale';
import type { PetClient, PetStore } from './stores/pet-and-order-stores';

type PetList = Awaited<ReturnType<PetClient['listPets']>>;

/**
 * `apiCall` keeps its result type by default, including with `exclusiveKey`,
 * `signal` or `isStale`. Only `staleResult: 'marker'` adds `StaleResult`.
 */
export async function staleResultTypes(store: PetStore): Promise<unknown[]> {
  const plain: PetList = await store.apiCall<
    PetClient,
    'listPets',
    Record<string, never>
  >('listPets', {}, { disableLoading: true });

  const exclusive: PetList = await store.apiCall<
    PetClient,
    'listPets',
    Record<string, never>
  >('listPets', {}, { exclusiveKey: 'list', signal: new AbortController().signal });

  const marked = await store.apiCall<PetClient, 'listPets', Record<string, never>>(
    'listPets',
    {},
    { exclusiveKey: 'list', staleResult: 'marker' },
  );
  // @ts-expect-error a call with staleResult: 'marker' may resolve with a StaleResult
  const unchecked: PetList = marked;
  const checked: PetList | undefined = isStaleResult(marked) ? undefined : marked;

  return [plain, exclusive, unchecked, checked];
}
