import { ReactNode } from 'react';

export type Variant = 'up' | 'down' | 'auto';

export type DropdownOption<T extends any = any> = {
  id: string | number;
  prefix?: ReactNode;
  element: ReactNode;
  value: T;
};

export type ResultOption<T extends any = any> = {
  id: string | number;
  value: T;
};
