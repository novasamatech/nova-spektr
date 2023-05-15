import { ReactNode } from 'react';

export type Position = 'up' | 'down' | 'auto';

export type DropdownOption<T extends any = any> = {
  id: string;
  element: ReactNode;
  value: T;
};

export type DropdownResult<T extends any = any> = {
  id: string;
  value: T;
};

export type HTMLComboboxProps = 'value' | 'type' | 'required' | 'disabled' | 'placeholder' | 'name' | 'className';
