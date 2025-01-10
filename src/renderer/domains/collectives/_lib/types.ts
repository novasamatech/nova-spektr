import { type ChainId } from '@/shared/core';

export type CollectivePalletsType = 'fellowship' | 'ambassador';

export type CollectivesStruct<T> = Partial<Record<CollectivePalletsType, Record<ChainId, T>>>;
