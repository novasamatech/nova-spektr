import { type BN } from '@polkadot/util';

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Pick<Partial<T>, K>;

export type RequiredNotNull<T> = {
  [K in keyof T]: NonNullable<T[K]>;
};

export type KeysOfType<T, TCondition> = {
  [K in keyof T]: T[K] extends TCondition ? K : never;
}[keyof T];

export type ObjectValues<T extends object> = T[keyof T];

export type OmitFirstArg<F> = F extends (first: any, ...args: infer P) => infer R ? (...args: P) => R : never;

export type ArrayOfKeys<T> = { [K in keyof T]: T[K] | T[K][] };

export type Serializable<T> = T extends string | number | null | undefined | boolean
  ? T
  : T extends BN | Date
    ? string
    : T extends (infer I)[]
      ? Serializable<I>[]
      : T extends Set<infer I>
        ? Serializable<I>[]
        : T extends Map<string, infer I>
          ? Record<string, I>
          : T extends NonNullable<unknown>
            ? {
                [K in keyof T]: Serializable<T[K]>;
              }
            : never;

export type Without<T, U extends PropertyKey> = { [P in Exclude<keyof T, U>]?: never };

export type XOR<T, U = object> = T | U extends object ? (Without<T, keyof U> & U) | (Without<U, keyof T> & T) : T | U;

export type ArrayElement<T extends unknown[]> = T extends (infer E)[] ? E : never;
