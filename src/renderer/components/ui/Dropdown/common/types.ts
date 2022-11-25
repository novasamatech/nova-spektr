import { ReactNode } from 'react';

export type Variant = 'up' | 'down' | 'auto';

export type DropdownOption<T extends any = any> = {
  prefix?: ReactNode;
  element: ReactNode;
  value: T;
};
