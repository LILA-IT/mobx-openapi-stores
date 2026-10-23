import type { ApiMethodName } from '../../utils/api/types/ApiMethod.type';
import type { ExpectTrue, IsAssignable } from '../helpers';
import type { GeneratedOrderConfiguration, OrderApi } from './order-api';
import type { GeneratedPetConfiguration, PetApi } from './pet-api';

/**
 * Generator packages each ship their own `Configuration` class with private fields.
 * Those classes are not mutually assignable (nominative), even when shapes match.
 */
export declare const petConfig: GeneratedPetConfiguration;
export declare const orderConfig: GeneratedOrderConfiguration;

// @ts-expect-error distinct private-field Configuration classes are incompatible
export const _cross: GeneratedPetConfiguration = orderConfig;

type StructuralConfig = { readonly basePath: string };

type _petIsStructural = ExpectTrue<
  IsAssignable<GeneratedPetConfiguration, StructuralConfig>
>;
type _orderIsStructural = ExpectTrue<
  IsAssignable<GeneratedOrderConfiguration, StructuralConfig>
>;

type InvalidApi = { notAnEndpoint: string };
type _invalidApiHasNoEndpoint = ExpectTrue<
  IsAssignable<ApiMethodName<InvalidApi>, never>
>;

/** Store API typing stays structural across independently generated runtimes. */
export type StructuralConfigFixture = {
  _petIsStructural: _petIsStructural;
  _orderIsStructural: _orderIsStructural;
  _invalidApiHasNoEndpoint: _invalidApiHasNoEndpoint;
  PetApi: PetApi;
  OrderApi: OrderApi;
};
