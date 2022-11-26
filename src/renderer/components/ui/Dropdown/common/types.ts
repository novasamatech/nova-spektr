import { ReactNode } from 'react';

export type Variant = 'up' | 'down' | 'auto';

export type DropdownOption<T extends any = any> = {
  id: string | number;
  element: ReactNode;
  value: T;
  prefix?: ReactNode;
};
