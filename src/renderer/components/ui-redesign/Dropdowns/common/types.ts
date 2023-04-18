import { ReactNode } from 'react';

export type Position = 'up' | 'down' | 'auto';

export type DropdownOption<T extends any = any> = {
  id: string | number;
  element: ReactNode;
  value?: T;
};

export type DropdownResult<T extends any = any> = {
  id: string;
  value?: T;
};
