import { type BN } from '@polkadot/util';

import { type Asset, type Chain, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatAsset, nonNullable, toRomanNumeral } from '@/shared/lib/utils';
import { DetailRow, Icon, Separator } from '@/shared/ui';
import { TransactionDetails } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { type Member, type OngoingReferendum, type Track, trackService } from '@/domains/collectives';
import { type AnyAccount } from '@/domains/network';

type Props = {
  account: AnyAccount;
  rank: number;
  maxRank: number;
  currentTrack: Track;
  nextTrack: Track | null;
  referendum: OngoingReferendum;
  proposer: Member | null;
  wallets: Wallet[];
  chain: Chain;
  asset: Asset;
  vote: 'aye' | 'nay';
  fee: BN;
};

export const VotingConfirmation = ({
  fee,
  account,
  wallets,
  currentTrack,
  nextTrack,
  chain,
  asset,
  vote,
  rank,
  maxRank,
  referendum,
  proposer,
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

        <span className="font-manrope text-[32px] font-bold leading-[36px] text-text-primary">
          {t('governance.referendum.votes', { votes, count: votes })}
        </span>
      </Box>

      <TransactionDetails wallets={wallets} chain={chain} initiator={[account]} signatory={null}>
        <DetailRow label={t('fellowship.voting.confirmation.referendumID')}>{referendum.id}</DetailRow>
        <DetailRow label={t('fellowship.voting.confirmation.referendumType')}>
          {isPromotionTrack && t('fellowship.voting.confirmation.promotionTrack')}
          {isRetentionTrack && t('fellowship.voting.confirmation.retentionTrack')}
          {isAnotherTrack && currentTrack.name}
        </DetailRow>
        {nonNullable(proposer) && nonNullable(nextTrack) && isPromotionTrack && (
          <DetailRow label={t('fellowship.voting.confirmation.rank')}>
            {`${toRomanNumeral(proposer.rank)} ${currentTrack.name.replace(/s$/, '')}`}
            &nbsp;{'→'}&nbsp;
            {`${toRomanNumeral(proposer.rank + 1)} ${nextTrack.name.replace(/s$/, '')}`}
          </DetailRow>
        )}
        {nonNullable(proposer) && isRetentionTrack && (
          <DetailRow label={t('fellowship.voting.confirmation.rank')}>
            {`${toRomanNumeral(proposer.rank)} ${currentTrack.name.replace(/s$/, '')}`}
          </DetailRow>
        )}
        <DetailRow label={t('fellowship.voting.confirmation.vote')}>{t(`fellowship.voting.${vote}`)}</DetailRow>
        <Separator className="border-filter-border" />
        <DetailRow label={t('fellowship.voting.confirmation.fee')}>{formatAsset(fee, asset)}</DetailRow>
      </TransactionDetails>
    </Box>
  );
};
