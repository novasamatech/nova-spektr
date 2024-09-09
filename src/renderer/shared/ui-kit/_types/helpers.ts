type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

export type XOR<T, U = object> = T | U extends NonNullable<unknown> ? (Without<T, U> & U) | (Without<U, T> & T) : T | U;
