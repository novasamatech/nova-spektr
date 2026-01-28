import { type BN } from '@polkadot/util';
import { capitalize } from 'lodash';
import { memo, useMemo } from 'react';

import { type Asset, type Chain, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatAsset, nonNullable, toRomanNumeral } from '@/shared/lib/utils';
import { type IconNames, DetailRow, Icon, Separator } from '@/shared/ui';
import { TransactionDetails } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { type Evidence, type Member, type Track, trackService } from '@/domains/collectives';
import { type AnyAccount } from '@/domains/network';

type Props = {
  account: AnyAccount;
  wallets: Wallet[];
  chain: Chain;
  asset: Asset;
  evidence: Evidence;
  vote: 'Aye' | 'Nay';
  votingMember: Member;
  proposerMember: Member;
  tracks: Track[];
  maxRank: number;
  fee: BN;
};

export const EvidenceVotingConfirmation = memo(
  ({ fee, account, wallets, chain, asset, vote, votingMember, proposerMember, tracks, maxRank, evidence }: Props) => {
    const { t } = useI18n();

    const currentTrack = tracks.find(t => t.id === proposerMember.rank);
    const nextTrack = tracks.find(t => t.id === proposerMember.rank + 1);

    const retentionTrack = currentTrack ? tracks.find(t => t.id === currentTrack.id + 10) : null;
    const promotionTrack = nextTrack ? tracks.find(t => t.id === nextTrack.id + 20) : null;

    const votes = trackService.getVoteWeight({
      pallet: 'fellowship',
      rank: votingMember.rank,
      maxRank,
      track: evidence.wish === 'Retention' ? (retentionTrack?.id ?? 0) : (promotionTrack?.id ?? 0),
    });

    let rankTitle = '';
    let iconName: IconNames | null = null;

    if (evidence.wish === 'Retention') {
      iconName = 'retain';
      if (currentTrack) {
        rankTitle = `${toRomanNumeral(currentTrack.id)} ${capitalize(currentTrack.name).replace(/s$/, '')}`;
      }
    }
    if (evidence.wish === 'Promotion') {
      iconName = 'promote';
      if (nextTrack) {
        rankTitle = `${toRomanNumeral(nextTrack.id)} ${capitalize(nextTrack.name).replace(/s$/, '')}`;
      }
    }

    const decisionDeposit = useMemo(() => (currentTrack ? currentTrack.decisionDeposit : null), [currentTrack]);

    return (
      <Box gap={6}>
        <Box gap={3} horizontalAlign="center">
          {iconName && <Icon className="text-icon-default" name={iconName} size={60} />}

          <span className="font-manrope text-[32px] leading-[36px] font-bold text-text-primary">
            {t('governance.referendum.votes', { votes, count: votes })}
          </span>
        </Box>
        <TransactionDetails wallets={wallets} chain={chain} initiators={[account]} signatory={account}>
          <DetailRow label={t('fellowship.salary.submitEvidenceConfirm.evidenceType')}>{evidence.wish}</DetailRow>
          <DetailRow label={t('fellowship.salary.submitEvidenceVoteConfirm.vote')}>{vote}</DetailRow>
          {rankTitle && (
            <DetailRow label={t('fellowship.salary.submitEvidenceConfirm.rank')}>
              <span>{rankTitle}</span>
            </DetailRow>
          )}
          <Separator />
          {nonNullable(decisionDeposit) && (
            <DetailRow label={t('fellowship.voting.confirmation.submissionDeposit')}>
              {formatAsset(decisionDeposit, asset)}
            </DetailRow>
          )}
          <DetailRow label={t('fellowship.voting.confirmation.fee')}>{formatAsset(fee, asset)}</DetailRow>
        </TransactionDetails>
      </Box>
    );
  },
);
