import { type BN } from '@polkadot/util';

import { type Asset, type Chain, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatAsset } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { DetailRow, Separator } from '@/shared/ui';
import { TransactionDetails } from '@/shared/ui-entities';
import { type AnyAccount } from '@/domains/network';
import { NamedAccount } from '@/widgets/NameResolver';

type Props = {
  account: AnyAccount;
  wallets: Wallet[];
  chain: Chain;
  asset: Asset;
  beneficiary: AccountId | null;
  fee: BN;
};

export const SalaryPayoutConfirmation = ({ fee, account, wallets, chain, asset, beneficiary }: Props) => {
  const { t } = useI18n();

  return (
    <TransactionDetails wallets={wallets} chain={chain} initiators={[account]} signatory={account}>
      <DetailRow label={t('fellowship.salary.beneficiary')}>
        <NamedAccount accountId={beneficiary || account.accountId} chain={chain} />
      </DetailRow>
      <Separator />
      <DetailRow label={t('fellowship.voting.confirmation.fee')}>{formatAsset(fee, asset)}</DetailRow>
    </TransactionDetails>
  );
};
