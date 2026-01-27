import { fellowshipContentSlot } from '@/pages/Fellowship/ui/Fellowship';

import { Tasks } from './components/Tasks';
import { fellowshipTasksFeature } from './feature';

export { Tasks } from './components/Tasks';
export { referendumVotingTaskActionSlot } from './components/tasks/OngoingReferendumVoting';
export {
  evidenceDetailsModalSlot,
  evidenceVotingTaskActionSlot,
} from './components/tasks/PromotionRetentionEvidenceVoting';
export { payoutSalaryTaskActionSlot } from './components/tasks/RequestPayout';
export { requestPromotionTaskActionSlot } from './components/tasks/RequestPromotion';
export { requestRetentionTaskActionSlot } from './components/tasks/RequestRetention';
export { requestSalaryTaskActionSlot } from './components/tasks/RequestSalary';
export { requestSalaryInductTaskActionSlot } from './components/tasks/RequestSalaryInduct';
export { completedReferendumVotingSlot } from './components/tasks/CompletedReferendumVoting';
export { promotionRetentionReferendumVotingSlot } from './components/tasks/PromotionRetentionReferendumVoting';
export { ongoingReferendumVotingSlot } from './components/tasks/OngoingReferendumVoting';
export { tasksService } from './service';

export { fellowshipTasksFeature };

fellowshipTasksFeature.inject(fellowshipContentSlot, {
  order: 1,
  render: () => <Tasks />,
});
