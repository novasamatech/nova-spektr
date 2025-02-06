import { fellowshipContentSlot } from '@/pages/Fellowship/ui/Fellowship';

import { Tasks } from './components/Tasks';
import { taskVotingActionSlot, taskVotingDetailsActionSlot } from './components/tasks/ReferendumVoting';
import { requestSalaryActionSlot } from './components/tasks/RequestSalary';
import { fellowshipTasksFeature } from './model/feature';

export { fellowshipTasksFeature, requestSalaryActionSlot, taskVotingActionSlot, taskVotingDetailsActionSlot };

fellowshipTasksFeature.inject(fellowshipContentSlot, {
  order: 0,
  render: () => <Tasks />,
});
