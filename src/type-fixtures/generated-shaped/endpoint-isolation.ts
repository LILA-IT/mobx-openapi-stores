import type { ApiMethodName } from '../../utils/api/types/ApiMethod.type';
import type { ExpectTrue, IsAssignable } from '../helpers';
import type { OrderApi } from './order-api';
import type { PetApi } from './pet-api';

/**
 * Distributive endpoint names must expose each client's methods,
 * not only the intersection (BaseAPI-only keys).
 */
type PetEndpoints = ApiMethodName<PetApi>;
type OrderEndpoints = ApiMethodName<OrderApi>;
type UnionEndpoints = ApiMethodName<PetApi | OrderApi>;

type _petHasList = ExpectTrue<IsAssignable<'listPets', PetEndpoints>>;
type _petHasGet = ExpectTrue<IsAssignable<'getPet', PetEndpoints>>;
type _orderHasList = ExpectTrue<IsAssignable<'listOrders', OrderEndpoints>>;
type _orderHasGet = ExpectTrue<IsAssignable<'getOrder', OrderEndpoints>>;

type _unionHasPet = ExpectTrue<IsAssignable<'listPets', UnionEndpoints>>;
type _unionHasOrder = ExpectTrue<IsAssignable<'listOrders', UnionEndpoints>>;

// Pet endpoints must not be attributed solely to OrderApi
type _orderRejectsPet = ExpectTrue<
  IsAssignable<'listPets', OrderEndpoints> extends true ? false : true
>;
type _petRejectsOrder = ExpectTrue<
  IsAssignable<'listOrders', PetEndpoints> extends true ? false : true
>;

export type MultiStoreEndpointFixture = {
  _petHasList: _petHasList;
  _petHasGet: _petHasGet;
  _orderHasList: _orderHasList;
  _orderHasGet: _orderHasGet;
  _unionHasPet: _unionHasPet;
  _unionHasOrder: _unionHasOrder;
  _orderRejectsPet: _orderRejectsPet;
  _petRejectsOrder: _petRejectsOrder;
};
