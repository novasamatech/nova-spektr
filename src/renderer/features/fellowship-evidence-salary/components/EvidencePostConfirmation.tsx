import { type BN } from '@polkadot/util';

import { type Asset, type Chain, type HexString, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatAsset } from '@/shared/lib/utils';
import { ButtonWebLink, DetailRow, Separator } from '@/shared/ui';
import { Hash, TransactionDetails } from '@/shared/ui-entities';
import { evidenceService } from '@/domains/collectives';
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

export const EvidencePostConfirmation = ({ fee, account, wallets, chain, asset, wish, evidence }: Props) => {
  const { t } = useI18n();

  const ipfsUrl = evidenceService.getEvidenceIpfsUrl(evidence);

  return (
    <TransactionDetails wallets={wallets} chain={chain} initiator={[account]} signatory={null}>
      <DetailRow label={t('fellowship.salary.submitEvidenceConfirm.wish')}>{wish}</DetailRow>
      <DetailRow label={t('fellowship.salary.submitEvidenceConfirm.evidence')}>
        <ButtonWebLink
          size="sm"
          variant="text"
          target="_blank"
          href={ipfsUrl.toString()}
          className="w-full overflow-hidden text-right"
        >
          <Hash variant="truncate" value={evidence} />
        </ButtonWebLink>
      </DetailRow>
      <Separator />
      <DetailRow label={t('fellowship.voting.confirmation.fee')}>{formatAsset(fee, asset)}</DetailRow>
    </TransactionDetails>
  );
};
