import { BN_ZERO } from '@polkadot/util';
import { capitalize } from 'lodash';
import { Trans } from 'react-i18next';

import { type DelegateInfo } from '@/shared/api/governance';
import { TEST_IDS } from '@/shared/constants';
import { type AccountVote, type Asset, type SplitAbstainVote, type StandardVote, type XOR } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { FootnoteText, Icon } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { votingService } from '@/entities/governance';

type Props = {
  asset: Asset;
  delegates: DelegateInfo[];
  castingVotes: {
    voter: AccountId;
    vote: AccountVote;
  }[];
};

export const VotedCombined = ({ asset, castingVotes, delegates }: Props) => {
  const { t } = useI18n();

  const hasDelegates = delegates.length > 0;
  const accountsVotes = castingVotes.map(({ vote }) => vote);
  const splitAbstainVotes = accountsVotes.filter(votingService.isSplitAbstainVote);

  if (splitAbstainVotes.length === castingVotes.length && !hasDelegates) {
    return <Voted asset={asset} type="abstain" votes={splitAbstainVotes} />;
  }

  const standardVotes = accountsVotes.filter(votingService.isStandardVote);

  const ayeVotes = standardVotes.filter((vote) => vote.vote.aye);

  const isAllAye = ayeVotes.length === accountsVotes.length;
  const isDelegatesAye = delegates.every((d) => d.decision === 'aye');
  const isCombinedAye = hasDelegates ? isDelegatesAye && isAllAye : isAllAye;

  if (isCombinedAye) {
    return <Voted asset={asset} type="aye" votes={ayeVotes} delegates={delegates} />;
  }

  const nayVotes = standardVotes.filter((vote) => !vote.vote.aye);

  const isAllNay = nayVotes.length === accountsVotes.length;
  const isDelegateNay = delegates.every((d) => d.decision === 'nay');
  const isCombinedNay = hasDelegates ? isDelegateNay && isAllNay : isAllNay;

  if (isCombinedNay) {
    return <Voted asset={asset} type="nay" votes={nayVotes} delegates={delegates} />;
  }

  return (
    <div className="flex items-center gap-x-1" data-testid={TEST_IDS.GOVERNANCE.PROPOSAL_VOTE_DETAILS}>
      <Icon name="voted" size={16} className="text-icon-accent" />
      <FootnoteText className="text-icon-accent">{t('governance.voted')}</FootnoteText>
    </div>
  );
};

type VotedProps = Pick<Props, 'asset'> &
  XOR<
    Pick<Props, 'delegates'> & {
      type: 'aye' | 'nay';
      votes: StandardVote[];
    },
    {
      type: 'abstain';
      votes: SplitAbstainVote[];
    }
  >;
const Voted = ({ asset, type, votes, delegates }: VotedProps) => {
  const { t } = useI18n();

  const votedAmount = votes.reduce((acc, vote) => {
    const isStandardVote = votingService.isStandardVote(vote);

    const balance = isStandardVote ? vote.balance : vote.abstain;
    const conviction = isStandardVote ? vote.vote.conviction : 'None';

    return acc.add(votingService.calculateVotingPower(balance, conviction));
  }, BN_ZERO);

  const delegatedAmount = (delegates ?? []).reduce((acc, delegate) => {
    return acc.add(votingService.calculateVotingPower(delegate.amount, delegate.conviction));
  }, BN_ZERO);

  return (
    <div className="flex items-center gap-x-1">
      <Icon name="voted" size={16} className="text-icon-accent" />
      <FootnoteText className="flex items-center gap-x-0.5 truncate whitespace-nowrap text-nowrap text-icon-accent">
        <Trans
          t={t}
          i18nKey={`governance.voted${capitalize(type)}`}
          components={{
            amount: (
              <AssetBalance className="text-icon-accent" asset={asset} value={votedAmount.add(delegatedAmount)} />
            ),
          }}
        />
      </FootnoteText>
    </div>
  );
};
