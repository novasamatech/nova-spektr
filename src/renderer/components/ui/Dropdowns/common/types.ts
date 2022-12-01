import { ReactNode } from 'react';

export type Variant = 'up' | 'down' | 'auto';

interface BaseOption<T extends any = any> {
  id: string | number;
  element: ReactNode;
  value: T;
}

export interface DropdownOption<T extends any = any> extends BaseOption<T> {
  prefix?: ReactNode;
}

export interface SelectOption extends BaseOption {}

export type ResultOption<T extends any = any> = {
  id: string | number;
  value: T;
};
