import { type ComponentType } from 'react';

import { type Transaction } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export type OperationType =
  | 'set_active'
  | 'salary_request'
  | 'salary_payout'
  | 'salary_induct'
  | 'evidence'
  | 'evidence_vote'
  | `evidence_request_${AccountId}`
  | `referendum_${number}`
  | `referendum_completed_${number}`;

export type TaskDescription<T extends NonNullable<unknown> = any> = {
  id: OperationType;
  group: 'personal' | 'general' | 'completed';
  weight: number;
  body: ComponentType<T & { transaction: Transaction | null }>;
  meta: T & { transaction: Transaction | null; tags: string[] };
  hasVoted?: boolean;
};
