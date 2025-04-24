import { or } from 'patronum';

import { dictionary } from '@/shared/lib/utils';
import { member } from '@/domains/collectives';

import { fellowshipVotingHistoryFeature } from './feature';
import { fellowshipModel } from './fellowship';

const $members = fellowshipModel.$store.map(store => dictionary(store?.members ?? [], 'accountId'));

export const membersModel = {
  $members,
  $pending: or(member.pending, fellowshipVotingHistoryFeature.isStarting),
  $fulfilled: member.fulfilled,
};
