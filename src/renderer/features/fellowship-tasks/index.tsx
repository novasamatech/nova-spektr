import { fellowshipContentSlot } from '@/pages/Fellowship/ui/Fellowship';

import { Tasks } from './components/Tasks';
import { taskVotingActionSlot } from './components/tasks/PromotionRetentionVoting';
import { payoutSalaryActionSlot } from './components/tasks/RequestPayout';
import { requestPromotionActionSlot } from './components/tasks/RequestPromotion';
import { requestRetentionActionSlot } from './components/tasks/RequestRetention';
import { requestSalaryActionSlot } from './components/tasks/RequestSalary';
import { requestSalaryInductActionSlot } from './components/tasks/RequestSalaryInduct';
import { fellowshipTasksFeature } from './model/feature';

export {
  fellowshipTasksFeature,
  requestSalaryActionSlot,
  requestSalaryInductActionSlot,
  requestPromotionActionSlot,
  requestRetentionActionSlot,
  taskVotingActionSlot,
  payoutSalaryActionSlot,
};

fellowshipTasksFeature.inject(fellowshipContentSlot, {
  order: 1,
  render: ({ onReferendumSelect }) => <Tasks onReferendumSelect={onReferendumSelect} />,
});
