import { format as fnsFormat } from 'date-fns/format';
import { enGB } from 'date-fns/locale/en-GB';

import { type RewardBucket } from './types';

/**
 * The locale-aware formatter the app hands out through `useI18n`. Passed in
 * rather than imported so label building stays pure and locale-independent in
 * tests.
 */
export type DateFormatter = (date: Date | number, pattern: string) => string;

export const defaultDateFormatter: DateFormatter = (date, pattern) => fnsFormat(date, pattern, { locale: enGB });

type AxisLabel = {
  /** Always drawn. */
  primary: string;
  /** Second line under the tick — the year, only where it changes. */
  secondary: string | null;
};

/**
 * The x tick of a bar. Days and weeks are dated (`Jul 22`); months carry only
 * the month name, with the year added on the first bar and every January so a
 * twelve-month window that crosses new year stays unambiguous without repeating
 * the year twelve times.
 */
export const formatAxisLabel = (bucket: RewardBucket, index: number, formatDate: DateFormatter): AxisLabel => {
  if (bucket.granularity === 'month') {
    const isJanuary = new Date(bucket.start).getMonth() === 0;

    return {
      primary: formatDate(bucket.start, 'MMM'),
      secondary: index === 0 || isJanuary ? formatDate(bucket.start, 'yyyy') : null,
    };
  }

  return { primary: formatDate(bucket.start, 'MMM d'), secondary: null };
};

/**
 * The date part of the hover card title. The surrounding wording ("Week of …")
 * is a translation applied by the caller.
 */
export const formatBucketDate = (bucket: RewardBucket, formatDate: DateFormatter): string => {
  switch (bucket.granularity) {
    case 'day':
    case 'week':
      return formatDate(bucket.start, 'MMM d');
    case 'month':
      return formatDate(bucket.start, 'MMMM yyyy');
  }
};
