import { fellowshipContentSlot } from '@/pages/Fellowship/ui/Fellowship';

import { Tasks } from './components/Tasks';
import { taskVotingActionSlot } from './components/tasks/OngoingReferendumVoting';
import { evidenceVotingActionSlot } from './components/tasks/PromotionRetentionVoting';
import { payoutSalaryActionSlot } from './components/tasks/RequestPayout';
import { requestPromotionActionSlot } from './components/tasks/RequestPromotion';
import { requestRetentionActionSlot } from './components/tasks/RequestRetention';
import { requestSalaryTaskActionSlot } from './components/tasks/RequestSalary';
import { requestSalaryInductActionSlot } from './components/tasks/RequestSalaryInduct';
import { fellowshipTasksFeature } from './model/feature';
import { votes } from './model/voting';
import { tasksService } from './service';

export {
  fellowshipTasksFeature,
  requestSalaryTaskActionSlot,
  requestSalaryInductActionSlot,
  requestPromotionActionSlot,
  requestRetentionActionSlot,
  taskVotingActionSlot,
  payoutSalaryActionSlot,
  evidenceVotingActionSlot,
  tasksService,
  votes,
};

fellowshipTasksFeature.inject(fellowshipContentSlot, {
  order: 1,
  render: ({ onReferendumSelect }) => <Tasks onReferendumSelect={onReferendumSelect} />,
});
