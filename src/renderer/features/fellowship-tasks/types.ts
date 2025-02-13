import { type ComponentType } from 'react';

export type OperationType =
  | 'set_active'
  | 'salary_request'
  | 'salary_payout'
  | 'salary_induct'
  | `referendum_${number}`;

export type TaskDescription<T extends NonNullable<unknown> = any> = {
  id: OperationType;
  priority: 0 | 1 | 2;
  body: ComponentType<T & { canSkip: boolean; onSkip: VoidFunction }>;
  meta: T;
};
