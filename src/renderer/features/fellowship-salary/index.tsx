import { fellowshipHeaderCardsSlot } from '@/pages/Fellowship/ui/Fellowship';

import { EntrypointCard } from './components/EntrypointCard';
import { SalaryRegisterConfirmation } from './components/SalaryRegisterConfirmation';
import { fellowshipSalaryFeature } from './model/feature';

export { fellowshipSalaryFeature, SalaryRegisterConfirmation };

fellowshipSalaryFeature.inject(fellowshipHeaderCardsSlot, {
  order: 1,
  render: () => <EntrypointCard />,
});
