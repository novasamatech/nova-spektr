import { type FeedRecord } from '@/domains/collectives';

export type ActivityFeedRecord = FeedRecord & {
  address: string;
  name?: string;
  duration: number;
  description?: string;
};
