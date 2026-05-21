import { type BN } from '@polkadot/util';
import { useUnit } from 'effector-react';

import { type Asset, type Chain, type HexString, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatAsset } from '@/shared/lib/utils';
import { DetailRow, Icon, Separator } from '@/shared/ui';
import { Hash, TransactionDetails } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { $ipfsGateways, evidenceService } from '@/domains/collectives';
import { type AnyAccount } from '@/domains/network';

type Props = {
  account: AnyAccount;
  wallets: Wallet[];
  chain: Chain;
  asset: Asset;
  evidenceType: 'Promotion' | 'Retention';
  evidence: HexString;
  fee: BN;
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
  const gateways = useUnit($ipfsGateways);
  const evidenceUrls = evidenceService.getEvidenceGatewayUrls(evidence, gateways);

  return (
    <Box>
      <Box horizontalAlign="center" padding={[0, 0, 6]}>
        <Icon name="evidence" size={60} />
      </Box>
      <TransactionDetails wallets={wallets} chain={chain} initiators={[account]} signatory={account}>
        <DetailRow label={t('fellowship.salary.submitEvidenceConfirm.evidenceType')}>{evidenceType}</DetailRow>
        <DetailRow label={t('fellowship.salary.submitEvidenceConfirm.evidence')}>
          <div className="ml-auto flex flex-col items-end gap-2">
            <Hash variant="truncate" value={evidence} />
            <div className="flex flex-wrap justify-end gap-2">
              {evidenceUrls.map(url => (
                <a
                  key={url.toString()}
                  href={url.toString()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-button-small font-medium text-primary-button-background-default"
                >
                  {`${t('fellowship.salary.submitEvidenceConfirm.evidence')} (${url.host})`}
                </a>
              ))}
            </div>
          </div>
        </DetailRow>
        <DetailRow label={t('fellowship.salary.submitEvidenceConfirm.rank')}>
          <span className="uppercase">{rank}</span>
        </DetailRow>
        <Separator />
        <DetailRow label={t('fellowship.voting.confirmation.fee')}>{formatAsset(fee, asset)}</DetailRow>
      </TransactionDetails>
    </Box>
  );
};
