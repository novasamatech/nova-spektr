import { fellowshipContentSlot } from '@/pages/Fellowship/ui/Fellowship';

import { Tasks } from './components/Tasks';
import { referendumVotingTaskActionSlot } from './components/tasks/OngoingReferendumVoting';
import { evidenceVotingTaskActionSlot } from './components/tasks/PromotionRetentionVoting';
import { payoutSalaryTaskActionSlot } from './components/tasks/RequestPayout';
import { requestPromotionTaskActionSlot } from './components/tasks/RequestPromotion';
import { requestRetentionATaskActionSlot } from './components/tasks/RequestRetention';
import { requestSalaryTaskActionSlot } from './components/tasks/RequestSalary';
import { requestSalaryInductTaskActionSlot } from './components/tasks/RequestSalaryInduct';
import { fellowshipTasksFeature } from './model/feature';
import { votes } from './model/voting';
import { tasksService } from './service';

export {
  fellowshipTasksFeature,
  requestSalaryTaskActionSlot,
  requestSalaryInductTaskActionSlot,
  requestPromotionTaskActionSlot,
  requestRetentionATaskActionSlot,
  referendumVotingTaskActionSlot,
  payoutSalaryTaskActionSlot,
  evidenceVotingTaskActionSlot,
  tasksService,
  votes,
};

fellowshipTasksFeature.inject(fellowshipContentSlot, {
  order: 1,
  render: ({ onReferendumSelect }) => <Tasks onReferendumSelect={onReferendumSelect} />,
});
