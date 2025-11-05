import { profileInfoSlot } from '@/features/fellowship-profile';

import { fellowshipPromotionFeature } from './feature';
import { PromotionWidget } from './ui/PromotionWidget';

export { fellowshipPromotionFeature };

export { referendumWidgetActionSlot, evidenceSubmitSlot } from './ui/PromotionWidget';

fellowshipPromotionFeature.inject(profileInfoSlot, {
  order: 1,
  render: ({ member }) => {
    return <PromotionWidget member={member} />;
  },
});
