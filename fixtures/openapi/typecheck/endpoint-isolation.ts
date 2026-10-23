import type { ExpectTrue, IsAssignable } from '../../../src/type-fixtures/helpers';
import type { ApiType } from '../../../src/types';
import type {
  ApiMethodArgs,
  ApiMethodName,
} from '../../../src/utils/api/types/ApiMethod.type';
import { OrderApi } from '../.generated/apis/OrderApi';
import { PetApi } from '../.generated/apis/PetApi';
import { Configuration as GeneratedConfiguration } from '../.generated/runtime';
import type { ApiConfiguration } from '../../../src/types';

type IsNever<T> = [T] extends [never] ? true : false;

/** Generated clients remain usable when intersected with the package's structural API type. */
type PetWithPackageApiType = PetApi & ApiType;
type OrderWithPackageApiType = OrderApi & ApiType;

type _petIntersectIsUsable = ExpectTrue<
  IsAssignable<IsNever<PetWithPackageApiType>, false>
>;
type _orderIntersectIsUsable = ExpectTrue<
  IsAssignable<IsNever<OrderWithPackageApiType>, false>
>;

/** Endpoint names resolve on the generated class alone. */
type PetEndpoints = ApiMethodName<PetApi>;
type OrderEndpoints = ApiMethodName<OrderApi>;

type _listPetsIsPetEndpoint = ExpectTrue<IsAssignable<'listPets', PetEndpoints>>;
type _getPetIsPetEndpoint = ExpectTrue<IsAssignable<'getPet', PetEndpoints>>;
type _listOrdersIsOrderEndpoint = ExpectTrue<IsAssignable<'listOrders', OrderEndpoints>>;
type _getOrderIsOrderEndpoint = ExpectTrue<IsAssignable<'getOrder', OrderEndpoints>>;

type _petRejectsOrderEndpoint = ExpectTrue<
  IsAssignable<IsAssignable<'listOrders', PetEndpoints>, false>
>;
type _orderRejectsPetEndpoint = ExpectTrue<
  IsAssignable<IsAssignable<'listPets', OrderEndpoints>, false>
>;

type GetPetArgs = ApiMethodArgs<PetApi, 'getPet'>;
/** Required path param: GetPetArgs must itself require petId (not merely accept it). */
type _getPetRequiresPetId = ExpectTrue<IsAssignable<GetPetArgs, { petId: string }>>;

type _generatedConfigMatchesPackageContract = ExpectTrue<
  IsAssignable<GeneratedConfiguration, ApiConfiguration>
>;

type StructuralConfig = { readonly basePath: string };
type _generatedConfigIsStructural = ExpectTrue<
  IsAssignable<GeneratedConfiguration, StructuralConfig>
>;

export type GeneratedOpenApiFixture = {
  _petIntersectIsUsable: _petIntersectIsUsable;
  _orderIntersectIsUsable: _orderIntersectIsUsable;
  _listPetsIsPetEndpoint: _listPetsIsPetEndpoint;
  _getPetIsPetEndpoint: _getPetIsPetEndpoint;
  _listOrdersIsOrderEndpoint: _listOrdersIsOrderEndpoint;
  _getOrderIsOrderEndpoint: _getOrderIsOrderEndpoint;
  _petRejectsOrderEndpoint: _petRejectsOrderEndpoint;
  _orderRejectsPetEndpoint: _orderRejectsPetEndpoint;
  _getPetRequiresPetId: _getPetRequiresPetId;
  _generatedConfigMatchesPackageContract: _generatedConfigMatchesPackageContract;
  _generatedConfigIsStructural: _generatedConfigIsStructural;
};
