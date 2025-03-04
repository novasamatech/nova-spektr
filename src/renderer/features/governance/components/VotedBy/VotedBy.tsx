import { BN_ZERO } from '@polkadot/util';
import { capitalize } from 'lodash';
import { Trans } from 'react-i18next';

import { type DelegateInfo } from '@/shared/api/governance';
import { TEST_IDS } from '@/shared/constants';
import {
  type AccountVote,
  type Address,
  type Asset,
  type SplitAbstainVote,
  type StandardVote,
  type XOR,
} from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { FootnoteText, Icon } from '@/shared/ui';
import { Address as AccountAddress, AssetBalance } from '@/shared/ui-entities';
import { votingService } from '@/entities/governance';

type Props = {
  asset: Asset;
  voterName?: string;
  delegate: DelegateInfo | null;
  castingVotes: {
    voter: Address;
    vote: AccountVote;
  }[];
};

export const VotedBy = ({ asset, voterName, castingVotes, delegate }: Props) => {
  // Delegate only
  if (nonNullable(delegate) && !castingVotes.length) {
    return <VotedByDelegate asset={asset} voterName={voterName} delegate={delegate} />;
  }

  // Voters and delegate if presented
  if (castingVotes.length > 0) {
    return <VotedCombined asset={asset} delegate={delegate} castingVotes={castingVotes} />;
  }

  // No delegate and No votes
  return null;
};

type ByDelegateProps = Omit<Props, 'castingVotes'> & {
  delegate: DelegateInfo;
};
const VotedByDelegate = ({ asset, voterName, delegate }: ByDelegateProps) => {
  const { t } = useI18n();

  const delegateName = voterName ? (
    <span>{voterName}</span>
  ) : (
    <AccountAddress showIcon={false} variant="short" address={delegate.delegateId} />
  );

  const amount = (
    <AssetBalance
      className="text-icon-accent"
      value={votingService.calculateVotingPower(delegate.amount, delegate.conviction)}
      asset={asset}
    />
  );

  return (
    <div className="flex items-center gap-x-1" data-testid={TEST_IDS.GOVERNANCE.PROPOSAL_VOTE_DETAILS}>
      <Icon name="voted" size={16} className="text-icon-accent" />
      <FootnoteText className="flex items-center gap-x-0.5 truncate whitespace-nowrap text-nowrap text-icon-accent">
        <Trans
          t={t}
          i18nKey={`governance.${delegate.decision === 'aye' ? 'votedAyeBy' : 'votedNayBy'}`}
          components={{ amount, delegate: delegateName }}
        />
      </FootnoteText>
    </div>
  );
};

type CombinedProps = Omit<Props, 'voterName'>;
const VotedCombined = ({ asset, castingVotes, delegate }: CombinedProps) => {
  const { t } = useI18n();

  const accountsVotes = castingVotes.map(({ vote }) => vote);
  const splitAbstainVotes = accountsVotes.filter(votingService.isSplitAbstainVote);

  if (splitAbstainVotes.length === castingVotes.length && nullable(delegate)) {
    return <Voted asset={asset} type="abstain" votes={splitAbstainVotes} />;
  }

  const ayeVotes = accountsVotes.filter((vote): vote is StandardVote => {
    return votingService.isStandardVote(vote) && vote.vote.aye;
  });

  const isAllAye = ayeVotes.length === accountsVotes.length;
  const isDelegateAye = delegate?.decision === 'aye';
  const isCombinedAye = delegate ? isDelegateAye && isAllAye : isAllAye;

  if (isCombinedAye) {
    return <Voted asset={asset} type="aye" votes={ayeVotes} delegate={delegate} />;
  }

  const nayVotes = accountsVotes.filter((vote): vote is StandardVote => {
    return votingService.isStandardVote(vote) && !vote.vote.aye;
  });

  const isAllNay = nayVotes.length === accountsVotes.length;
  const isDelegateNay = delegate?.decision === 'nay';
  const isCombinedNay = delegate ? isDelegateNay && isAllNay : isAllNay;

  if (isCombinedNay) {
    return <Voted asset={asset} type="nay" votes={nayVotes} delegate={delegate} />;
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
    Pick<Props, 'delegate'> & {
      type: 'aye' | 'nay';
      votes: StandardVote[];
    },
    {
      type: 'abstain';
      votes: SplitAbstainVote[];
    }
  >;
const Voted = ({ asset, type, votes, delegate }: VotedProps) => {
  const { t } = useI18n();

  const amount = votes.reduce(
    (acc, vote) => {
      const isStandardVote = votingService.isStandardVote(vote);

      const balance = isStandardVote ? vote.balance : vote.abstain;
      const conviction = isStandardVote ? vote.vote.conviction : 'None';

      return acc.add(votingService.calculateVotingPower(balance, conviction));
    },
    delegate ? votingService.calculateVotingPower(delegate.amount, delegate.conviction) : BN_ZERO,
  );

  return (
    <div className="flex items-center gap-x-1">
      <Icon name="voted" size={16} className="text-icon-accent" />
      <FootnoteText className="flex items-center gap-x-0.5 truncate whitespace-nowrap text-nowrap text-icon-accent">
        <Trans
          t={t}
          i18nKey={`governance.voted${capitalize(type)}`}
          components={{ amount: <AssetBalance className="text-icon-accent" asset={asset} value={amount} /> }}
        />
      </FootnoteText>
    </div>
  );
};
