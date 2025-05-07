export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;
