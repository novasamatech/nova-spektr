import { type BN } from '@polkadot/util';
import { capitalize } from 'lodash';
import { memo } from 'react';

import { type Asset, type Chain, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatAsset, nonNullable, toRomanNumeral } from '@/shared/lib/utils';
import { DetailRow, Icon, Separator } from '@/shared/ui';
import { TransactionDetails } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { type OngoingReferendum, type Track, trackService } from '@/domains/collectives';
import { type AnyAccount } from '@/domains/network';

type Props = {
  account: AnyAccount;
  rank: number;
  maxRank: number;
  memberTrack: Track;
  currentProposerTrack: Track | null;
  nextProposerTrack: Track | null;
  referendum: OngoingReferendum;
  wallets: Wallet[];
  chain: Chain;
  asset: Asset;
  vote: 'aye' | 'nay';
  fee: BN;
};

export const VotingConfirmation = memo(
  ({
    fee,
    account,
    wallets,
    memberTrack,
    currentProposerTrack,
    nextProposerTrack,
    chain,
    asset,
    vote,
    rank,
    maxRank,
    referendum,
  }: Props) => {
    const { t } = useI18n();

    const votes = trackService.getVoteWeight({ pallet: 'fellowship', rank, maxRank, track: referendum.track });

    const isPromotionTrack = trackService.isPromotionTrack(referendum.track);
    const isRetentionTrack = trackService.isRetentionTrack(referendum.track);
    const isAnotherTrack = !isRetentionTrack && !isPromotionTrack;

    return (
      <Box gap={6}>
        <Box gap={3} horizontalAlign="center">
          <Icon className="text-icon-default" name="voteMst" size={60} />

          <span className="font-manrope text-[32px] leading-[36px] font-bold text-text-primary">
            {t('governance.referendum.votes', { votes, count: votes })}
          </span>
        </Box>

        <TransactionDetails wallets={wallets} chain={chain} initiators={[account]} signatory={account}>
          <DetailRow label={t('fellowship.voting.confirmation.referendumID')}>{referendum.id}</DetailRow>
          <DetailRow label={t('fellowship.voting.confirmation.referendumType')}>
            {isPromotionTrack && t('fellowship.voting.confirmation.promotionTrack')}
            {isRetentionTrack && t('fellowship.voting.confirmation.retentionTrack')}
            {isAnotherTrack && capitalize(memberTrack.name)}
          </DetailRow>
          {isPromotionTrack && nonNullable(nextProposerTrack) && (
            <DetailRow label={t('fellowship.voting.confirmation.rank')}>
              {nonNullable(currentProposerTrack) && (
                <>
                  {`${toRomanNumeral(currentProposerTrack.id)} ${capitalize(currentProposerTrack.name).replace(/s$/, '')}`}
                  &nbsp;{'→'}&nbsp;
                </>
              )}
              {`${toRomanNumeral(nextProposerTrack.id)} ${capitalize(nextProposerTrack.name).replace(/s$/, '')}`}
            </DetailRow>
          )}
          {isRetentionTrack && nonNullable(currentProposerTrack) && (
            <DetailRow label={t('fellowship.voting.confirmation.rank')}>
              {`${toRomanNumeral(currentProposerTrack.id)} ${capitalize(currentProposerTrack.name).replace(/s$/, '')}`}
            </DetailRow>
          )}
          <DetailRow label={t('fellowship.voting.confirmation.vote')}>{t(`fellowship.voting.${vote}`)}</DetailRow>
          <Separator className="border-filter-border" />
          <DetailRow label={t('fellowship.voting.confirmation.fee')}>{formatAsset(fee, asset)}</DetailRow>
        </TransactionDetails>
      </Box>
    );
  },
);
