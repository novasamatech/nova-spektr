import { fellowshipHeaderCardsSlot } from '@/pages/Fellowship/ui/Fellowship';

import { SalaryCard } from './components/SalaryCard';
import { fellowshipSalaryFeature } from './model/feature';

export { fellowshipSalaryFeature };

fellowshipSalaryFeature.inject(fellowshipHeaderCardsSlot, {
  order: 2,
  render: () => <SalaryCard />,
});
