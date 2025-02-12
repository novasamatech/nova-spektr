import { type BN } from '@polkadot/util';

import { type Asset, type Chain, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatAsset } from '@/shared/lib/utils';
import { DetailRow, Icon, Separator } from '@/shared/ui';
import { TransactionDetails } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { type OngoingReferendum, trackService } from '@/domains/collectives';
import { type AnyAccount } from '@/domains/network';

type Props = {
  account: AnyAccount;
  rank: number;
  maxRank: number;
  referendum: OngoingReferendum;
  wallets: Wallet[];
  chain: Chain;
  asset: Asset;
  vote: 'aye' | 'nay';
  fee: BN;
};

export const VotingConfirmation = ({ fee, account, wallets, chain, asset, vote, rank, maxRank, referendum }: Props) => {
  const { t } = useI18n();

  const votes = trackService.getVoteWeight({ pallet: 'fellowship', rank, maxRank, track: referendum.track });

  return (
    <Box gap={6}>
      <Box gap={3} horizontalAlign="center">
        <Icon className="text-icon-default" name="voteMst" size={60} />

        <span className="font-manrope text-[32px] font-bold leading-[36px] text-text-primary">
          {t('governance.referendum.votes', {
            votes: votes,
            count: votes,
          })}
        </span>
      </Box>

      <TransactionDetails wallets={wallets} chain={chain} initiator={[account]} signatory={null}>
        <DetailRow label={t('fellowship.voting.confirmation.vote')}>{t(`fellowship.voting.${vote}`)}</DetailRow>
        <Separator className="border-filter-border" />
        <DetailRow label={t('fellowship.voting.confirmation.fee')}>{formatAsset(fee, asset)}</DetailRow>
      </TransactionDetails>
    </Box>
  );
};
