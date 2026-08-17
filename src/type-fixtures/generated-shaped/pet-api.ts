/**
 * Simulates an OpenAPI Generator `Configuration` from module A
 * (private field → nominative typing across generator packages).
 */
export class GeneratedPetConfiguration {
  constructor(private configuration: { basePath?: string } = {}) {}

  get basePath(): string {
    return this.configuration.basePath ?? '';
  }
}

export type Pet = { id: string; name: string };

/**
 * Generated-shaped Pet API client (structural ApiType intersection).
 */
export type PetApi = {
  initApi: (config: typeof GeneratedPetConfiguration) => void;
  listPets: (request: Record<string, never>) => Promise<Pet[]>;
  getPet: (request: { petId: string }) => Promise<Pet>;
};
