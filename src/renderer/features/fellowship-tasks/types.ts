import { type ReactNode } from 'react';

export type TaskDescription = {
  id: string;
  priority: 0 | 1 | 2;
  title: ReactNode;
  body: ReactNode;
  action: VoidFunction;
};
