import { type BN } from '@polkadot/util';

import { type Asset, type Chain, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatAsset } from '@/shared/lib/utils';
import { DetailRow } from '@/shared/ui';
import { TransactionDetails } from '@/shared/ui-entities';
import { type AnyAccount } from '@/domains/network';

type Props = {
  account: AnyAccount;
  wallets: Wallet[];
  chain: Chain;
  asset: Asset;
  fee: BN;
};

export const SalaryRegisterConfirmation = ({ fee, account, wallets, chain, asset }: Props) => {
  const { t } = useI18n();

  return (
    <TransactionDetails wallets={wallets} chain={chain} initiators={[account]} signatory={account}>
      <DetailRow label={t('fellowship.voting.confirmation.fee')}>{formatAsset(fee, asset)}</DetailRow>
    </TransactionDetails>
  );
};
