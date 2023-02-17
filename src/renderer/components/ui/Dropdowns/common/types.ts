import { ReactNode } from 'react';

export type Variant = 'up' | 'down' | 'auto';

export type DropdownOption<T extends any = any> = {
  id: string;
  element: ReactNode;
  value: T;
};

export type DropdownResult<T extends any = any> = {
  id: string;
  value: T;
};
