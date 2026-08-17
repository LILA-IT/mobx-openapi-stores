/**
 * Simulates an OpenAPI Generator `Configuration` from module B
 * (separate class identity from pet-api Configuration).
 */
export class GeneratedOrderConfiguration {
  constructor(private configuration: { basePath?: string } = {}) {}

  get basePath(): string {
    return this.configuration.basePath ?? '';
  }
}

export type Order = { id: string; total: number };

/**
 * Generated-shaped Order API client — endpoints must not bleed into Pet stores.
 */
export type OrderApi = {
  initApi: (config: typeof GeneratedOrderConfiguration) => void;
  listOrders: (request: Record<string, never>) => Promise<Order[]>;
  getOrder: (request: { orderId: string }) => Promise<Order>;
};
