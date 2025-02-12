import { type BN } from '@polkadot/util';

import { type AccountId, type BlockHeight } from '@/shared/polkadotjs-schemas';

type GenericFeed = {
  accountId: AccountId;
  block: BlockHeight;
  at: Date;
};

// Member activity flag has been set.
type FeedEventActiveChanged = GenericFeed & {
  type: 'activeChanged';
  isActive: boolean;
};

// Member has been promoted to the given rank.
type FeedEventPromoted = GenericFeed & {
  type: 'promoted';
  rank: number;
};

// Member has been demoted to the given (non-zero) rank.
type FeedEventDemoted = GenericFeed & {
  type: 'demoted';
  rank: number;
};

// Member has been proven at their current rank, postponing auto-demotion.
type FeedEventProven = GenericFeed & {
  type: 'proven';
  rank: number;
};

// Member has stated evidence of their efforts their request for rank.
type FeedEventRequested = GenericFeed & {
  type: 'requested';
  wish: 'Retention' | 'Promotion';
};

// Pre-ranked account has been inducted at their current rank.
type FeedEventImported = GenericFeed & {
  type: 'imported';
  rank: number;
};

// A payment happened.
type FeedSalaryPaid = GenericFeed & {
  type: 'paid';
  beneficiary: AccountId;
  amount: BN;
};

export type FeedRecord =
  | FeedEventActiveChanged
  | FeedEventPromoted
  | FeedEventDemoted
  | FeedEventProven
  | FeedEventRequested
  | FeedEventImported
  | FeedSalaryPaid;
