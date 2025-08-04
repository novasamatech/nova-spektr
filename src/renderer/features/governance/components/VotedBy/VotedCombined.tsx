import { type DelegateInfo } from '@/shared/api/governance';
import { TEST_IDS } from '@/shared/constants';
import { type AccountVote, type Address, type Asset, type Identity } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { FootnoteText, Icon } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { votingService } from '@/entities/governance';

import { VotedByAccounts } from './VotedByAccounts';
import { VotedByDelegates } from './VotedByDelegates';

type Props = {
  direction: 'column' | 'row';
  asset: Asset;
  identity: Record<Address, Identity>;
  delegates: DelegateInfo[];
  multiplier?: boolean;
  castingVotes: {
    voter: AccountId;
    vote: AccountVote;
  }[];
};

export const VotedCombined = ({ direction, asset, identity, delegates, multiplier, castingVotes }: Props) => {
  const { t } = useI18n();

  const accountsVotes = castingVotes.map(({ vote }) => vote);
  const standardVotes = accountsVotes.filter(votingService.isStandardVote);

  const accountsSameDesicion =
    accountsVotes.every(votingService.isSplitAbstainVote) ||
    standardVotes.every((vote) => vote.vote.aye) ||
    standardVotes.every((vote) => !vote.vote.aye);

  const delegatesSameDecision =
    delegates.every((d) => d.decision === 'aye') || delegates.every((d) => d.decision === 'nay');

  if (accountsSameDesicion && delegatesSameDecision) {
    return (
      <Box direction={direction} gap={2}>
        <VotedByAccounts asset={asset} castingVotes={castingVotes} multiplier={multiplier} />
        <VotedByDelegates asset={asset} delegates={delegates} identity={identity} multiplier={multiplier} />
      </Box>
    );
  }

  return (
    <div className="flex w-full items-center gap-x-1" data-testid={TEST_IDS.GOVERNANCE.PROPOSAL_VOTE_DETAILS}>
      <Icon name="voted" size={16} className="text-icon-accent shrink-0" />
      <FootnoteText className="text-icon-accent">{t('governance.voted')}</FootnoteText>
    </div>
  );
};
