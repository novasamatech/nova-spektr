import { ReactNode } from 'react';

export type RadioOption<T extends any = any> = {
  id: string | number;
  value: T;
  element: ReactNode;
};

export type ResultOption<T extends any = any> = {
  id: string | number;
  value: T;
};
