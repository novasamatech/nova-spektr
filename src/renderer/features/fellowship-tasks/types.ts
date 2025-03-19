import { type ComponentType } from 'react';

export type OperationType =
  | 'set_active'
  | 'salary_request'
  | 'salary_payout'
  | 'salary_induct'
  | 'evidence'
  | `referendum_${number}`
  | `referendum_completed_${number}`;

export type TaskDescription<T extends NonNullable<unknown> = any> = {
  id: OperationType;
  group: 'personal' | 'general' | 'completed';
  priority: number;
  body: ComponentType<T>;
  meta: T;
};
