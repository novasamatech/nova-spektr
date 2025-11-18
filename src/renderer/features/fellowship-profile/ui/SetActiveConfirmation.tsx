import { type BN } from '@polkadot/util';
import { memo } from 'react';

import { type Asset, type Chain, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatAsset } from '@/shared/lib/utils';
import { DetailRow, Separator } from '@/shared/ui';
import { TransactionDetails } from '@/shared/ui-entities';
import { type AnyAccount } from '@/domains/network';

type Props = {
  account: AnyAccount;
  wallets: Wallet[];
  chain: Chain;
  asset: Asset;
  isActive: boolean;
  fee: BN;
};

export const SetActiveConfirmation = memo(({ fee, account, wallets, chain, asset, isActive }: Props) => {
  const { t } = useI18n();

  return (
    <TransactionDetails wallets={wallets} chain={chain} initiators={[account]} signatory={account}>
      <DetailRow label={t('fellowship.profile.setActive.active')}>
        {isActive ? t('fellowship.profile.setActive.activeTrue') : t('fellowship.profile.setActive.activeFalse')}
      </DetailRow>
      <Separator className="border-filter-border" />
      <DetailRow label={t('fellowship.voting.confirmation.fee')}>{formatAsset(fee, asset)}</DetailRow>
    </TransactionDetails>
  );
});
