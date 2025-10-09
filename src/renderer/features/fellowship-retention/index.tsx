import { profileInfoSlot } from '@/features/fellowship-profile';

import { fellowshipRetentionFeature } from './models/feature';
import { RetentionWidget } from './ui/RetentionWidget';

export { fellowshipRetentionFeature };

export { referendumWidgetActionSlot } from './ui/RetentionWidget';

fellowshipRetentionFeature.inject(profileInfoSlot, {
  order: 0,
  render: ({ member }) => {
    return <RetentionWidget member={member} />;
  },
});
