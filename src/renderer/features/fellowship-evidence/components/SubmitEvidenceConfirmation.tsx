import { type BN } from '@polkadot/util';

import { type Asset, type Chain, type HexString, type Wallet } from '@/shared/core';
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
  wish: 'Promotion' | 'Retention';
  evidence: HexString;
  fee: BN;
};

export const SubmitEvidenceConfirmation = ({ fee, account, wallets, chain, asset, wish, evidence }: Props) => {
  const { t } = useI18n();

  return (
    <TransactionDetails wallets={wallets} chain={chain} initiators={[account]} signatory={account}>
      <DetailRow label={t('fellowship.salary.submitEvidenceConfirm.wish')}>{wish}</DetailRow>
      <DetailRow label={t('fellowship.salary.submitEvidenceConfirm.evidence')}>{evidence}</DetailRow>
      <Separator />
      <DetailRow label={t('fellowship.voting.confirmation.fee')}>{formatAsset(fee, asset)}</DetailRow>
    </TransactionDetails>
  );
};
