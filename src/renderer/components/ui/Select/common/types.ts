import { ReactNode } from 'react';

export type Variant = 'up' | 'down' | 'auto';

export type SelectOption<T extends any = any> = {
  id: string | number;
  value: T;
  element: ReactNode;
};
