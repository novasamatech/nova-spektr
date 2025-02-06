import { type ComponentType } from 'react';

export type TaskDescription<T extends NonNullable<unknown> = any> = {
  id: string;
  priority: 0 | 1 | 2;
  body: ComponentType<T & { canSkip: boolean; onSkip: VoidFunction }>;
  meta: T;
};
