import { type DropdownOption } from '@/shared/ui/Dropdowns/common/types';
import { type VotingStatus } from '../../model/filter';

export const voteOptions = [
  { id: 'voted', value: 'voted', element: 'governance.voted' },
  { id: 'notVoted', value: 'notVoted', element: 'governance.filters.notVoted' },
] satisfies DropdownOption<VotingStatus>[];
