import { type BN } from '@polkadot/util';

import { type Asset, type Chain, type HexString, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatAsset } from '@/shared/lib/utils';
import { ButtonWebLink, DetailRow, Icon, Separator } from '@/shared/ui';
import { Hash, TransactionDetails } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { evidenceService } from '@/domains/collectives';
import { type AnyAccount } from '@/domains/network';

type Props = {
  account: AnyAccount;
  wallets: Wallet[];
  chain: Chain;
  asset: Asset;
  evidenceType: 'Promotion' | 'Retention';
  evidence: HexString;
  fee: BN | null;
  rank: string;
};

export const EvidencePostConfirmation = ({
  fee,
  account,
  wallets,
  chain,
  asset,
  evidenceType,
  evidence,
  rank,
}: Props) => {
  const { t } = useI18n();

  const ipfsUrl = evidenceService.getEvidenceIpfsUrl(evidence);

  return (
    <Box>
      <Box horizontalAlign="center" padding={[0, 0, 6]}>
        <Icon name="evidence" size={60} />
      </Box>
      <TransactionDetails wallets={wallets} chain={chain} initiators={[account]} signatory={account}>
        <DetailRow label={t('fellowship.salary.submitEvidenceConfirm.evidenceType')}>{evidenceType}</DetailRow>
        <DetailRow label={t('fellowship.salary.submitEvidenceConfirm.evidence')}>
          <ButtonWebLink
            size="sm"
            variant="text"
            target="_blank"
            href={ipfsUrl.toString()}
            className="w-full overflow-hidden p-0 text-right"
          >
            <Hash variant="truncate" value={evidence} />
          </ButtonWebLink>
        </DetailRow>
        <DetailRow label={t('fellowship.salary.submitEvidenceConfirm.rank')}>
          <span className="uppercase">{rank}</span>
        </DetailRow>
        <Separator />
        {fee && <DetailRow label={t('fellowship.voting.confirmation.fee')}>{formatAsset(fee, asset)}</DetailRow>}
      </TransactionDetails>
    </Box>
  );
};
