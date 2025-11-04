import { profileInfoSlot } from '@/features/fellowship-profile';

import { fellowshipPromotionFeature } from './models/feature';
import { PromotionWidget } from './ui/PromotionWidget';

export { fellowshipPromotionFeature };

export { referendumWidgetActionSlot } from './ui/PromotionWidget';

fellowshipPromotionFeature.inject(profileInfoSlot, {
  order: 1,
  render: ({ member }) => {
    return <PromotionWidget member={member} />;
  },
});
