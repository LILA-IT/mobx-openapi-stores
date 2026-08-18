/** Extracts the element type from a readonly or mutable array. */
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;
