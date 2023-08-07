import { ReactNode } from 'react';

export type Position = 'up' | 'down' | 'auto';
export type Theme = 'dark' | 'light';

export type DropdownOption<T extends any = any> = {
  id: string;
  element: ReactNode;
  value: T;
};

export type DropdownResult<T extends any = any> = {
  id: string;
  value: T;
};

export type ComboboxOption<T extends any = any> = DropdownOption<T>;
