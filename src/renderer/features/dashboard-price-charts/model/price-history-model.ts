import { createEvent, createStore } from 'effector';

import { type PriceHistoryTimeRange } from '@/domains/network';

export type TimeRange = PriceHistoryTimeRange;

export type AssetConfig = { id: string; label: string };

export const TRACKED_ASSETS: AssetConfig[] = [
  { id: 'polkadot', label: 'DOT' },
  { id: 'kusama', label: 'KSM' },
];

const $timeRange = createStore<TimeRange>('7d');
const timeRangeChanged = createEvent<TimeRange>();
$timeRange.on(timeRangeChanged, (_, range) => range);

export const priceHistoryModel = {
  $timeRange,
  events: { timeRangeChanged },
};
