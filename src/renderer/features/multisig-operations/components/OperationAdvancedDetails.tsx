import { useUnit } from 'effector-react';

import { type Chain, type MultisigAccount, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, copyToClipboard, truncate } from '@/shared/lib/utils';
import { DetailRow, FootnoteText, Icon } from '@/shared/ui';
import { Account, AccountExplorers, AssetBalance } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { type MultisigOperation } from '@/domains/network';
import { operationDetailsUtils } from '@/entities/operations';
import { signatoryUtils } from '@/entities/signatory';
import { WalletIcon, accountUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';

type Props = {
  operation: MultisigOperation;
  wallets: Wallet[];
  chain: Chain;
};

const InteractionStyle =
  'rounded hover:bg-action-background-hover hover:text-text-primary cursor-pointer py-[3px] px-2 -mr-2';

export const OperationAdvancedDetails = ({ operation, wallets, chain }: Props) => {
  const { t } = useI18n();
  const accounts = useUnit(walletSelect.$selectedAccounts);

  const { indexCreated, blockCreated, deposit, depositor, callHash, transaction } = operation;
  const valueClass = 'text-text-secondary';
  const multisigAccount = accounts.find(a => accountUtils.isMultisigAccount(a));
  const signatories = (multisigAccount as MultisigAccount).signatories;

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

      {transaction && (
        <DetailRow label={t('operation.details.callData')} className={valueClass}>
          <button
            type="button"
            className={cnTw('group flex items-center gap-x-1', InteractionStyle)}
            onClick={() => copyToClipboard(transaction.callData)}
          >
            <FootnoteText className="text-inherit">{truncate(transaction.callData, 7, 8)}</FootnoteText>
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
          <AssetBalance value={deposit} asset={defaultAsset} className="py-[3px] text-footnote text-text-secondary" />
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
