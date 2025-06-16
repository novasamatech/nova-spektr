import { createTransformer } from '@/shared/di';

import { type AnyAccount } from './types';

export interface AccountNodeConfig {
  title: string;
  color: string;
}

export const accountNodeConfigTransformer = createTransformer<AnyAccount, AccountNodeConfig>();
