import { type Chain, type WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { truncate } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { DetailRow, FootnoteText, Icon } from '@/shared/ui';
import { Account, AssetBalance, ChainIcon, WalletIcon } from '@/shared/ui-entities';
import { Box, Copy, Modal } from '@/shared/ui-kit';
import { Json } from '@/shared/ui-kit/Json/Json';
import { type OperationTitle } from '@/features/multisig-operations';
import { NamedAccount } from '@/widgets/NameResolver';

type DraftSummaryProps = {
  multisigName: string;
  multisigAccountId?: AccountId;
  proxyName?: string;
  proxyAccountId?: AccountId;
  threshold?: string;
  chain: Chain | null;
  walletType?: WalletType;
  titleData?: OperationTitle | null;
  destinationAccountId?: AccountId | null;
  callData?: string;
  jsonArgs?: object | null;
};

export const DraftSummary = ({
  multisigName,
  multisigAccountId,
  proxyName,
  proxyAccountId,
  threshold,
  chain,
  walletType,
  titleData,
  destinationAccountId,
  callData,
  jsonArgs,
}: DraftSummaryProps) => {
  const { t } = useI18n();

  return (
    <dl className="flex flex-col gap-y-4 text-footnote">
      {chain?.name && (
        <DetailRow label={t('transfer.networkLabel')} className="flex gap-x-2">
          <ChainIcon chain={chain} size={16} />
          <FootnoteText>{chain.name}</FootnoteText>
        </DetailRow>
      )}
      {walletType && (
        <DetailRow label={t('transaction.details.wallet')} className="flex gap-x-2">
          <WalletIcon type={walletType} size={16} />
          <FootnoteText>{multisigName}</FootnoteText>
        </DetailRow>
      )}
      {!walletType && (
        <DetailRow label={t('transaction.details.wallet')}>
          <FootnoteText>{multisigName}</FootnoteText>
        </DetailRow>
      )}
      {multisigAccountId && chain && (
        <DetailRow label={t('transaction.details.account')}>
          <Account variant="short" accountId={multisigAccountId} chain={chain} title={multisigName} />
        </DetailRow>
      )}
      {proxyAccountId && chain && (
        <DetailRow label={t('operations.drafts.proxyLabel')}>
          <Account variant="short" accountId={proxyAccountId} chain={chain} title={proxyName} />
        </DetailRow>
      )}
      {threshold && (
        <DetailRow label={t('createMultisigAccount.thresholdName')}>
          <FootnoteText>{threshold}</FootnoteText>
        </DetailRow>
      )}
      {titleData?.title && (
        <DetailRow label={t('operations.drafts.summaryOperation')}>
          <FootnoteText>{titleData.title}</FootnoteText>
        </DetailRow>
      )}
      {titleData?.amount && (
        <DetailRow label={t('operations.drafts.summaryAmount')}>
          <AssetBalance value={titleData.amount.value} asset={titleData.amount.asset} className="text-footnote" />
        </DetailRow>
      )}
      {destinationAccountId && chain && (
        <DetailRow label={t('operation.details.recipient')}>
          <NamedAccount accountId={destinationAccountId} variant="short" chain={chain} />
        </DetailRow>
      )}
      {callData && (
        <DetailRow label={t('operation.details.callData')}>
          <div className="flex items-center gap-1">
            <Copy value={callData}>
              <button
                type="button"
                className="group -mr-2 flex cursor-pointer items-center gap-x-1 rounded-sm px-2 py-[3px] hover:bg-action-background-hover hover:text-text-primary"
              >
                <FootnoteText className="text-inherit">{truncate(callData, 7, 8)}</FootnoteText>
                <Icon name="copy" size={16} className="group-hover:text-icon-hover" />
              </button>
            </Copy>
            {jsonArgs && (
              <Modal size="lg" height="fit">
                <Modal.Trigger>
                  <button
                    type="button"
                    className="group cursor-pointer rounded-sm px-2 py-[3px] hover:bg-action-background-hover"
                  >
                    <Icon name="details" size={16} className="group-hover:text-icon-hover" />
                  </button>
                </Modal.Trigger>
                <Modal.Title close>{t('operation.viewJSON.label')}</Modal.Title>
                <Modal.Content>
                  <Box padding={5}>
                    <Json value={jsonArgs} name="callData" expandDepth={3} />
                  </Box>
                </Modal.Content>
              </Modal>
            )}
          </div>
        </DetailRow>
      )}
    </dl>
  );
};
