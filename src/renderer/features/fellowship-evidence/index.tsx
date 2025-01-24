import { fellowshipHeaderCardsSlot } from '@/pages/Fellowship/ui/Fellowship';

import { EvidenceCard } from './components/EvidenceCard';
import { fellowshipEvidenceFeature } from './model/feature';

export { fellowshipEvidenceFeature };

fellowshipEvidenceFeature.inject(fellowshipHeaderCardsSlot, {
  order: 1,
  render: () => <EvidenceCard />,
});
