import { BN_ZERO } from '@polkadot/util';
import { useMemo } from 'react';
import { Trans } from 'react-i18next';

import { TEST_IDS } from '@/shared/constants';
import { type AccountVote, type Asset, type SplitAbstainVote, type StandardVote, type XOR } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { FootnoteText, Icon } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { locksService, votingService } from '@/entities/governance';

type Props = {
  asset: Asset;
  multiplier?: boolean;
  castingVotes: {
    voter: AccountId;
    vote: AccountVote;
  }[];
};

export const VotedByAccounts = ({ asset, castingVotes, multiplier }: Props) => {
  const { t } = useI18n();

  const accountsVotes = castingVotes.map(({ vote }) => vote);
  const splitAbstainVotes = accountsVotes.filter(votingService.isSplitAbstainVote);

  if (splitAbstainVotes.length === castingVotes.length) {
    return <Voted type="abstain" asset={asset} votes={splitAbstainVotes} />;
  }

  const standardVotes = accountsVotes.filter(votingService.isStandardVote);
  const ayeVotes = standardVotes.filter((vote) => vote.vote.aye);

  if (ayeVotes.length === accountsVotes.length) {
    return <Voted type="aye" asset={asset} votes={ayeVotes} multiplier={multiplier} />;
  }

  const nayVotes = standardVotes.filter((vote) => !vote.vote.aye);

  if (nayVotes.length === accountsVotes.length) {
    return <Voted type="nay" asset={asset} votes={nayVotes} multiplier={multiplier} />;
  }

  return (
    <div className="flex w-full items-center gap-x-1" data-testid={TEST_IDS.GOVERNANCE.PROPOSAL_VOTE_DETAILS}>
      <Icon name="voted" size={16} className="shrink-0 text-icon-accent" />
      <FootnoteText className="text-icon-accent">{t('governance.voted')}</FootnoteText>
    </div>
  );
};

type VotedProps = Omit<Props, 'castingVotes'> &
  XOR<
    {
      type: 'aye' | 'nay';
      votes: StandardVote[];
    },
    {
      type: 'abstain';
      votes: SplitAbstainVote[];
    }
  >;
const Voted = ({ asset, type, votes, multiplier }: VotedProps) => {
  const { t } = useI18n();

  const votedAmount = votes.reduce((acc, vote) => {
    return votingService.isStandardVote(vote) ? acc.add(vote.balance) : acc.add(vote.abstain);
  }, BN_ZERO);

  const showMultiplier = multiplier && votes.length === 1;

  const i18nKey: Record<typeof type, string> = {
    nay: showMultiplier ? 'governance.votedConvictedNay' : 'governance.votedNay',
    aye: showMultiplier ? 'governance.votedConvictedAye' : 'governance.votedAye',
    abstain: 'governance.votedAbstain',
  };

  const conviction = useMemo(() => {
    if (!showMultiplier || !votes[0] || !votingService.isStandardVote(votes[0])) return undefined;

    return locksService.getLockPeriodsMultiplier(votes[0].vote.conviction);
  }, [showMultiplier, votes.length]);

  return (
    <div className="flex w-full items-center gap-x-1">
      <Icon name="voted" size={16} className="shrink-0 text-icon-accent" />
      <FootnoteText className="flex items-center gap-x-0.5 truncate text-nowrap whitespace-nowrap text-icon-accent">
        <Trans
          t={t}
          i18nKey={i18nKey[type]}
          values={{ multiplier: conviction }}
          components={{
            amount: <AssetBalance className="text-icon-accent" asset={asset} value={votedAmount} />,
          }}
        />
      </FootnoteText>
    </div>
  );
};
