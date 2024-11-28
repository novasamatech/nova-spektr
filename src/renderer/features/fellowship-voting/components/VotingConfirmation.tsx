import { type BN } from '@polkadot/util';

import { type Account, type Asset, type Chain, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatAsset } from '@/shared/lib/utils';
import { DetailRow, Icon, Separator } from '@/shared/ui';
import { TransactionDetails } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { collectiveDomain } from '@/domains/collectives';

type Props = {
  account: Account;
  rank: number;
  wallets: Wallet[];
  chain: Chain;
  asset: Asset;
  vote: 'aye' | 'nay';
  fee: BN;
};

export const VotingConfirmation = ({ fee, account, wallets, chain, asset, vote, rank }: Props) => {
  const { t } = useI18n();

  // TODO it should be placed somewhere in config
  const votes = collectiveDomain.tracksService.getGeometricVoteWeight(rank);

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
