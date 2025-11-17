import { profileInfoSlot } from '@/features/fellowship-profile';

import { fellowshipRetentionFeature } from './feature';
import { RetentionWidget } from './ui/RetentionWidget';

export { fellowshipRetentionFeature };

export { referendumWidgetActionSlot, evidenceSubmitSlot } from './ui/RetentionWidget';

fellowshipRetentionFeature.inject(profileInfoSlot, {
  order: 0,
  render: ({ member }) => {
    return <RetentionWidget member={member} />;
  },
});
