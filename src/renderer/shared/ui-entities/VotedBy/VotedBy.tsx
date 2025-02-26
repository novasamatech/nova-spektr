import { BN_ZERO } from '@polkadot/util';
import { Trans } from 'react-i18next';

import { type DelegateInfo } from '@/shared/api/governance';
import { type AccountVote, type Address, type Asset } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { FootnoteText, Icon } from '@/shared/ui';
import { AssetBalance } from '@/entities/asset';
import { votingService } from '@/entities/governance';
import { Address as AccountAddress } from '../Address/Address';

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
    <div className="flex items-center gap-x-1">
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

  const allAye = castingVotes.every(({ vote }) => votingService.isStandardVote(vote) && vote.vote.aye);
  const allNay = castingVotes.every(({ vote }) => votingService.isStandardVote(vote) && !vote.vote.aye);

  const isDelegateAye = delegate?.decision === 'aye';
  const isDelegateNay = delegate?.decision === 'nay';

  const isCombinedAye = delegate ? isDelegateAye && allAye : allAye;
  const isCombinedNay = delegate ? isDelegateNay && allNay : allNay;

  if (!isCombinedAye && !isCombinedNay) {
    return (
      <div className="flex items-center gap-x-1">
        <Icon name="voted" size={16} className="text-icon-accent" />
        <FootnoteText className="text-icon-accent">{t('governance.voted')}</FootnoteText>
      </div>
    );
  }

  const amount = castingVotes.reduce(
    (acc, { vote }) => {
      if (!votingService.isStandardVote(vote)) return acc;

      return acc.add(votingService.calculateVotingPower(vote.balance, vote.vote.conviction));
    },
    delegate ? votingService.calculateVotingPower(delegate.amount, delegate.conviction) : BN_ZERO,
  );

  return (
    <div className="flex items-center gap-x-1">
      <Icon name="voted" size={16} className="text-icon-accent" />
      <FootnoteText className="flex items-center gap-x-0.5 truncate whitespace-nowrap text-nowrap text-icon-accent">
        <Trans
          t={t}
          i18nKey={`governance.${allAye ? 'votedAye' : 'votedNay'}`}
          components={{ amount: <AssetBalance className="text-icon-accent" asset={asset} value={amount} /> }}
        />
      </FootnoteText>
    </div>
  );
};
