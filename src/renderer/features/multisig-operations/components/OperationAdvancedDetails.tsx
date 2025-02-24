import { type Chain, type FlexibleMultisigTransaction, type MultisigTransaction, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, copyToClipboard, truncate } from '@/shared/lib/utils';
import { DetailRow, FootnoteText, Icon } from '@/shared/ui';
import { Account, AccountExplorers } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { AssetBalance } from '@/entities/asset';
import { operationDetailsUtils } from '@/entities/operations';
import { signatoryUtils } from '@/entities/signatory';
import { WalletIcon } from '@/entities/wallet';

type Props = {
  tx: MultisigTransaction | FlexibleMultisigTransaction;
  wallets: Wallet[];
  chain: Chain;
};

const InteractionStyle =
  'rounded hover:bg-action-background-hover hover:text-text-primary cursor-pointer py-[3px] px-2 -mr-2';

export const OperationAdvancedDetails = ({ tx, wallets, chain }: Props) => {
  const { t } = useI18n();
  const { signatories, indexCreated, blockCreated, deposit, depositor, callHash, callData } = tx;
  const valueClass = 'text-text-secondary';

  const extrinsicLink = operationDetailsUtils.getMultisigExtrinsicLink(
    callHash,
    indexCreated,
    blockCreated,
    chain.explorers,
  );
  const depositorSignatory = signatories.find(s => s.accountId === depositor);
  const depositorWallet =
    depositorSignatory && signatoryUtils.getSignatoryWallet(wallets, depositorSignatory.accountId);

  const defaultAsset = chain.assets.at(0);

  if (!defaultAsset) {
    return null;
  }

  return (
    <Box gap={2}>
      {callHash && (
        <DetailRow label={t('operation.details.callHash')} className={valueClass}>
          <button
            type="button"
            className={cnTw('group flex items-center gap-x-1', InteractionStyle)}
            onClick={() => copyToClipboard(callHash)}
          >
            <FootnoteText className="text-inherit">{truncate(callHash, 7, 8)}</FootnoteText>
            <Icon name="copy" size={16} className="group-hover:text-icon-hover" />
          </button>
        </DetailRow>
      )}

      {callData && (
        <DetailRow label={t('operation.details.callData')} className={valueClass}>
          <button
            type="button"
            className={cnTw('group flex items-center gap-x-1', InteractionStyle)}
            onClick={() => copyToClipboard(callData)}
          >
            <FootnoteText className="text-inherit">{truncate(callData, 7, 8)}</FootnoteText>
            <Icon name="copy" size={16} className="group-hover:text-icon-hover" />
          </button>
        </DetailRow>
      )}

      {deposit && defaultAsset && depositorSignatory && <hr className="border-divider" />}

      {depositorSignatory && (
        <DetailRow label={t('operation.details.depositor')} className={valueClass}>
          <div className="min-w-min text-footnote">
            {depositorWallet ? (
              <div className="flex items-center gap-2">
                <WalletIcon size={16} type={depositorWallet.type} />
                <span>{depositorWallet.name}</span>
                <AccountExplorers accountId={depositorSignatory.accountId} chain={chain} />
              </div>
            ) : (
              <Account
                title={depositorSignatory.name}
                chain={chain}
                accountId={depositorSignatory.accountId}
                variant="short"
              />
            )}
          </div>
        </DetailRow>
      )}

      {deposit && defaultAsset && (
        <DetailRow label={t('operation.details.deposit')} className={valueClass}>
          <AssetBalance
            value={deposit}
            asset={defaultAsset}
            showIcon={false}
            className="py-[3px] text-footnote text-text-secondary"
          />
        </DetailRow>
      )}

      {deposit && defaultAsset && depositorSignatory && <hr className="border-divider" />}

      {indexCreated && blockCreated && (
        <DetailRow label={t('operation.details.timePoint')} className={valueClass}>
          {extrinsicLink ? (
            <a
              className={cnTw('group flex items-center gap-x-1', InteractionStyle)}
              href={extrinsicLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FootnoteText className="text-text-secondary">
                {blockCreated}-{indexCreated}
              </FootnoteText>
              <Icon name="globe" size={16} className="group-hover:text-icon-hover" />
            </a>
          ) : (
            `${blockCreated}-${indexCreated}`
          )}
        </DetailRow>
      )}
    </Box>
  );
};
