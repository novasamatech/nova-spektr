import { activityFeedRecordDescriptionSlot } from '@/features/fellowship-activity-feed';
import { fellowshipSidebarSlot } from '@/pages/Fellowship/ui/Fellowship';

import { EntrypointCard } from './components/EntrypointCard';
import { evidenceSlot, salarySlot } from './components/EvidenceSalaryModal';
import { fellowshipEvidenceSalaryFeature } from './model/feature';

export { evidenceSlot, salarySlot, fellowshipEvidenceSalaryFeature };

fellowshipEvidenceSalaryFeature.inject(fellowshipSidebarSlot, {
  order: 1,
  render: () => <EntrypointCard />,
});

fellowshipEvidenceSalaryFeature.inject(activityFeedRecordDescriptionSlot, ({ t, record }) => {
  switch (record.type) {
    case 'promoted':
      return <>{t('fellowship.activityFeed.record.promoted', { rank: record.rank })}</>;
    case 'demoted':
      return <>{t('fellowship.activityFeed.record.demoted', { rank: record.rank })}</>;
    case 'proven':
      return <>{t('fellowship.activityFeed.record.proven', { rank: record.rank })}</>;
    case 'requested':
      return record.wish === 'Promotion' ? (
        <>{t('fellowship.activityFeed.record.submittedPromotion')}</>
      ) : (
        <>{t('fellowship.activityFeed.record.submittedRetention')}</>
      );
    default:
      return null;
  }
});
