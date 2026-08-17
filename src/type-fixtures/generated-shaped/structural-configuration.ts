import type { ExpectTrue, IsAssignable } from '../helpers';
import type { GeneratedOrderConfiguration, OrderApi } from './order-api';
import type { GeneratedPetConfiguration, PetApi } from './pet-api';

/**
 * Generator packages each ship their own `Configuration` class with private fields.
 * Those classes are not mutually assignable (nominative), even when shapes match.
 */
declare const petConfig: GeneratedPetConfiguration;
declare const orderConfig: GeneratedOrderConfiguration;

// @ts-expect-error distinct private-field Configuration classes are incompatible
const _cross: GeneratedPetConfiguration = orderConfig;
void _cross;
void petConfig;

type StructuralConfig = { readonly basePath: string };

type _petIsStructural = ExpectTrue<
  IsAssignable<GeneratedPetConfiguration, StructuralConfig>
>;
type _orderIsStructural = ExpectTrue<
  IsAssignable<GeneratedOrderConfiguration, StructuralConfig>
>;

/**
 * Desired contract (enforced after OpenAPI runtime slim): store config typing is
 * structural so either generated Configuration works with initApi/createApi.
 * Until then, this documents the structural target shape.
 */
export type StructuralConfigFixture = {
  _petIsStructural: _petIsStructural;
  _orderIsStructural: _orderIsStructural;
  PetApi: PetApi;
  OrderApi: OrderApi;
};
