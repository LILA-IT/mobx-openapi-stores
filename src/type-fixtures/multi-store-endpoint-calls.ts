import type { OrderStore, PetStore } from './stores/pet-and-order-stores';

/**
 * Each store's typed `call` wrapper must reject the other client's endpoints.
 * If these @ts-expect-error lines become unused, endpoint isolation regressed.
 */
export function multiStoreEndpointCalls(
  petStore: PetStore,
  orderStore: OrderStore,
): void {
  void petStore.listPets();
  void petStore.getPet('p1');
  void orderStore.listOrders();
  void orderStore.getOrder('o1');

  // @ts-expect-error PetStore must not accept Order endpoints
  void petStore.call('listOrders', {});

  // @ts-expect-error OrderStore must not accept Pet endpoints
  void orderStore.call('listPets', {});

  // @ts-expect-error wrong arg key for getPet
  void petStore.call('getPet', { orderId: 'x' });

  // @ts-expect-error wrong arg key for getOrder
  void orderStore.call('getOrder', { petId: 'x' });
}
