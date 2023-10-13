export type PartialBy<T, K extends keyof T> = Omit<T, K> & Pick<Partial<T>, K>;

export type ObjectValues<T extends object> = T[keyof T];
