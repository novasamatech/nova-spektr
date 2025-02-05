import { type AccountId } from '@/shared/polkadotjs-schemas';

export type Evidence = {
  wish: 'Promotion' | 'Retention';
  accountId: AccountId;
  hash: string;
  cid: string;
  content: string;
};
