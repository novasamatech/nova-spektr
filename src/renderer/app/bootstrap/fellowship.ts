/* eslint-disable import-x/max-dependencies */

import { registerFeatures } from '@/shared/feature';
import { fellowshipActivityFeedFeature } from '@/features/fellowship-activity-feed';
import { fellowshipBasketFeature } from '@/features/fellowship-basket';
import { fellowshipSalaryFeature } from '@/features/fellowship-evidence-salary';
import { fellowshipMembersFeature } from '@/features/fellowship-members';
import { fellowshipProfileFeature } from '@/features/fellowship-profile';
import { fellowshipReferendumsDetailsFeature } from '@/features/fellowship-referendum-details';
import { fellowshipTasksFeature } from '@/features/fellowship-tasks';
import { fellowshipVotingFeature } from '@/features/fellowship-voting';
import { fellowshipVotingHistoryFeature } from '@/features/fellowship-voting-history';

export const bootstrapFellowship = () => {
  registerFeatures([
    fellowshipActivityFeedFeature,
    fellowshipMembersFeature,
    fellowshipProfileFeature,
    fellowshipReferendumsDetailsFeature,
    fellowshipSalaryFeature,
    fellowshipTasksFeature,
    fellowshipVotingFeature,
    fellowshipVotingHistoryFeature,
    fellowshipBasketFeature,
  ]);
};
