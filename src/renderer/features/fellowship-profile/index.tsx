import { activityFeedRecordDescriptionSlot } from '@/features/fellowship-activity-feed';
import { fellowshipSidebarSlot } from '@/pages/Fellowship/ui/Fellowship';

import { fellowshipProfileFeature } from './model/feature';
import { setActive } from './model/setActive';
import { alertsReferendumSlot } from './ui/Alerts';
import { ProfileCard } from './ui/ProfileCard';
import { profileInfoSlot } from './ui/ProfileModal';
import { referendumActivityItemActionSlot } from './ui/ReferendumActivityItem';
import { SetActiveConfirmation } from './ui/SetActiveConfirmation';

export {
  fellowshipProfileFeature,
  SetActiveConfirmation,
  setActive,
  profileInfoSlot,
  referendumActivityItemActionSlot,
  alertsReferendumSlot,
};

fellowshipProfileFeature.inject(fellowshipSidebarSlot, {
  order: 0,
  render: () => <ProfileCard />,
});

fellowshipProfileFeature.inject(activityFeedRecordDescriptionSlot, ({ t, record }) => {
  switch (record.type) {
    case 'activeChanged':
      return (
        <>{t('fellowship.activityFeed.record.activeChanged', { status: record.isActive ? 'active' : 'inactive' })}</>
      );
    case 'imported':
      return <>{t('fellowship.activityFeed.record.imported', { rank: record.rank })}</>;
    default:
      return null;
  }
});
