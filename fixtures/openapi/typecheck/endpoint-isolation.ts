import type { ExpectTrue, IsAssignable } from '../../../src/type-fixtures/helpers';
import type { ApiType } from '../../../src/types';
import type {
  ApiMethodArgs,
  ApiMethodName,
} from '../../../src/utils/api/types/ApiMethod.type';
import { OrderApi } from '../.generated/apis/OrderApi';
import { PetApi } from '../.generated/apis/PetApi';
import { Configuration as GeneratedConfiguration } from '../.generated/runtime';
import { Configuration as PackageConfiguration } from '../../../src/openapi-generator';

type IsNever<T> = [T] extends [never] ? true : false;

/**
 * Generated clients + package ApiType collide on private-field BaseAPI/Configuration
 * (two generator runtimes). Documented here — MR5 structural ApiType must make this false.
 */
type PetWithPackageApiType = PetApi & ApiType;
type OrderWithPackageApiType = OrderApi & ApiType;

type _petIntersectIsNever = ExpectTrue<IsNever<PetWithPackageApiType>>;
type _orderIntersectIsNever = ExpectTrue<IsNever<OrderWithPackageApiType>>;

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

declare const generatedConfig: GeneratedConfiguration;
declare const packageConfig: PackageConfiguration;

// @ts-expect-error distinct private-field Configuration classes are incompatible
const _crossConfig: PackageConfiguration = generatedConfig;
void _crossConfig;
void packageConfig;

type StructuralConfig = { readonly basePath: string };
type _generatedConfigIsStructural = ExpectTrue<
  IsAssignable<GeneratedConfiguration, StructuralConfig>
>;

export type GeneratedOpenApiFixture = {
  _petIntersectIsNever: _petIntersectIsNever;
  _orderIntersectIsNever: _orderIntersectIsNever;
  _listPetsIsPetEndpoint: _listPetsIsPetEndpoint;
  _getPetIsPetEndpoint: _getPetIsPetEndpoint;
  _listOrdersIsOrderEndpoint: _listOrdersIsOrderEndpoint;
  _getOrderIsOrderEndpoint: _getOrderIsOrderEndpoint;
  _petRejectsOrderEndpoint: _petRejectsOrderEndpoint;
  _orderRejectsPetEndpoint: _orderRejectsPetEndpoint;
  _getPetRequiresPetId: _getPetRequiresPetId;
  _generatedConfigIsStructural: _generatedConfigIsStructural;
};
