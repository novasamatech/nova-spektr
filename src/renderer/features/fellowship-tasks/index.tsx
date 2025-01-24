import { fellowshipContentSlot } from '@/pages/Fellowship/ui/Fellowship';

import { Tasks } from './components/Tasks';
import { fellowshipTasksFeature } from './model/feature';

export { fellowshipTasksFeature };

fellowshipTasksFeature.inject(fellowshipContentSlot, {
  order: 0,
  render: () => <Tasks />,
});
