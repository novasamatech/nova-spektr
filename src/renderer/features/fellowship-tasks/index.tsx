import { fellowshipContentSlot } from '@/pages/Fellowship/ui/Fellowship';

import { Tasks } from './components/Tasks';
import { requestSalaryActionSlot } from './components/tasks/RequestSalary';
import { fellowshipTasksFeature } from './model/feature';

export { fellowshipTasksFeature, requestSalaryActionSlot };

fellowshipTasksFeature.inject(fellowshipContentSlot, {
  order: 0,
  render: () => <Tasks />,
});
