import { ReactNode } from 'react';

export type Option<T extends any = any> = {
  id: string;
  value: T;
  element: ReactNode;
};

export type ResultOption<T extends any = any> = {
  id: string;
  value: T;
};
