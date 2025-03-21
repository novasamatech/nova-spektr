import { type ComponentType } from 'react';

import { type Transaction } from '@/shared/core';
import { type Referendum } from '@/domains/collectives';

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
  weight: number;
  body: ComponentType<T & { transaction: Transaction | null; onReferendumSelect(referendum: Referendum): void }>;
  meta: T & { transaction: Transaction | null; tags: string[] };
};
