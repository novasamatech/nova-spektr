import { ReactNode } from 'react';

export type Variant = 'up' | 'down' | 'auto';

export type OptionType<T extends any = any> = {
  prefix?: ReactNode;
  label: string;
  value: T;
};
