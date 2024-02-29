export type PartialBy<T, K extends keyof T> = Omit<T, K> & Pick<Partial<T>, K>;

export type RequiredNotNull<T> = {
  [K in keyof T]: NonNullable<T[K]>
}

export type KeysOfType<T, TCondition> = {
  [K in keyof T]: T[K] extends TCondition ? K : never;
}[keyof T];

export type ObjectValues<T extends object> = T[keyof T];
