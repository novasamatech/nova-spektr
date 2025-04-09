import { fellowshipContentSlot } from '@/pages/Fellowship/ui/Fellowship';

import { Tasks } from './components/Tasks';
import { fellowshipTasksFeature } from './model/feature';

export { Tasks } from './components/Tasks';
export { evidenceActionsSlot } from './components/EvidenceDetailsModal/EvidenceDetailsModal';
export { referendumVotingTaskActionSlot } from './components/tasks/OngoingReferendumVoting';
export { evidenceVotingTaskActionSlot } from './components/tasks/PromotionRetentionVoting';
export { payoutSalaryTaskActionSlot } from './components/tasks/RequestPayout';
export { requestPromotionTaskActionSlot } from './components/tasks/RequestPromotion';
export { requestRetentionATaskActionSlot } from './components/tasks/RequestRetention';
export { requestSalaryTaskActionSlot } from './components/tasks/RequestSalary';
export { requestSalaryInductTaskActionSlot } from './components/tasks/RequestSalaryInduct';
export { votes } from './model/voting';
export { tasksService } from './service';

export { fellowshipTasksFeature };

fellowshipTasksFeature.inject(fellowshipContentSlot, {
  order: 1,
  render: ({ onReferendumSelect }) => <Tasks onReferendumSelect={onReferendumSelect} />,
});
