import { profileInfoSlot } from '@/features/fellowship-profile';

import { PromotionWidget } from './components/widget';
import { fellowshipPromotionFeature } from './models/feature';

export { fellowshipPromotionFeature };

export { referendumWidgetActionSlot } from './components/widget';

fellowshipPromotionFeature.inject(profileInfoSlot, {
  order: 0,
  render: () => <PromotionWidget />,
});
