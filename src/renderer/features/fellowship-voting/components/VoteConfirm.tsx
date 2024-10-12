import { useI18n } from '@/app/providers';
import { type Account, type Chain, type Wallet } from '@/shared/core';
import { DetailRow, Icon, Separator } from '@/shared/ui';
import { TransactionDetails } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { collectiveDomain } from '@/domains/collectives';

type Props = {
  account: Account;
  rank: number;
  wallets: Wallet[];
  chain: Chain;
  vote: string;
};

export const VoteConfirm = ({ account, wallets, chain, vote, rank }: Props) => {
  const { t } = useI18n();

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
      <TransactionDetails wallets={wallets} chain={chain} initiator={account}>
        <DetailRow label="Vote">{vote}</DetailRow>
        <Separator className="border-filter-border" />
        {/* eslint-disable-next-line i18next/no-literal-string */}
        <DetailRow label="Fee">Bibip</DetailRow>
      </TransactionDetails>
    </Box>
  );
};
