import { ReactNode } from 'react';

export type Variant = 'up' | 'down' | 'auto';

export type Option<T extends any = any> = {
  id: string | number;
  element: ReactNode;
  value: T;
};

export type ResultOption<T extends any = any> = {
  id: string | number;
  value: T;
};
