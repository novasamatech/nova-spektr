export type PartialBy<T, K extends keyof T> = Omit<T, K> & Pick<Partial<T>, K>;

export type KeysOfType<T, TCondition> = {
  [K in keyof T]: T[K] extends TCondition ? K : never;
}[keyof T];

export type ObjectValues<T extends object> = T[keyof T];

export type OmitFirstArg<F> = F extends (first: any, ...args: infer P) => infer R ? (...args: P) => R : never;

export type ArrayOfKeys<T extends Object> = { [K in keyof T]: T[K] | T[K][] };
