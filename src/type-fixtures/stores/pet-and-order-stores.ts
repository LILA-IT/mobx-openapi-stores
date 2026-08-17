import { ApiStore } from '../../stores/ApiStore';
import type { ApiType } from '../../types';
import type { ApiMethodArgs, ApiMethodName } from '../../utils/api/types/ApiMethod.type';
import type { OrderApi } from '../generated-shaped/order-api';
import type { PetApi } from '../generated-shaped/pet-api';

export type PetClient = PetApi & ApiType;
export type OrderClient = OrderApi & ApiType;

/**
 * Typed apiCall wrappers — the pattern consumers use when base `apiCall`
 * generics collapse across many store subclasses (see ApiStore JSDoc).
 */
export class PetStore extends ApiStore<PetClient> {
  call = <
    Endpoint extends ApiMethodName<PetClient>,
    Args extends ApiMethodArgs<PetClient, Endpoint>,
  >(
    endpoint: Endpoint,
    args: Args extends undefined ? never : Args,
  ) => this.apiCall<PetClient, Endpoint, Args>(endpoint, args);

  listPets() {
    return this.call('listPets', {});
  }

  getPet(petId: string) {
    return this.call('getPet', { petId });
  }
}

export class OrderStore extends ApiStore<OrderClient> {
  call = <
    Endpoint extends ApiMethodName<OrderClient>,
    Args extends ApiMethodArgs<OrderClient, Endpoint>,
  >(
    endpoint: Endpoint,
    args: Args extends undefined ? never : Args,
  ) => this.apiCall<OrderClient, Endpoint, Args>(endpoint, args);

  listOrders() {
    return this.call('listOrders', {});
  }

  getOrder(orderId: string) {
    return this.call('getOrder', { orderId });
  }
}
