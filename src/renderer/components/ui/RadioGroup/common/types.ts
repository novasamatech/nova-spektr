import { ReactNode } from 'react';

export type RadioOption<T extends any = any> = {
  id: string;
  value: T;
  element: ReactNode;
};

export type RadioResult<T extends any = any> = {
  id: string;
  value: T;
};
