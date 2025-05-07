import { type TFunction } from 'i18next';

import { type FeedRecord } from '@/domains/collectives';

export const getDescription = (record: FeedRecord, t: TFunction) => {
  switch (record.type) {
    case 'promoted':
      return t('fellowship.activityFeed.record.promoted', { rank: record.rank });
    case 'demoted':
      return t('fellowship.activityFeed.record.demoted', { rank: record.rank });
    case 'proven':
      return t('fellowship.activityFeed.record.proven', { rank: record.rank });
    case 'requested':
      return record.wish === 'Promotion'
        ? t('fellowship.activityFeed.record.submittedPromotion')
        : t('fellowship.activityFeed.record.submittedRetention');
    case 'activeChanged':
      return t('fellowship.activityFeed.record.activeChanged', { status: record.isActive ? 'active' : 'inactive' });
    case 'imported':
      return t('fellowship.activityFeed.record.imported', { rank: record.rank });
    default:
      return undefined;
  }
};
