import { type BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { type TFunction } from 'i18next';
import { memo, useMemo } from 'react';

import {
  type Asset,
  type AssetByChains,
  type Chain,
  type ChainId,
  type FlexibleMultisigAccount,
  type MultisigAccount,
} from '@/shared/core';
import { createTransformer, useTransformer } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { formatSectionAndMethod, toAddress, toShortAddress, validateCallData } from '@/shared/lib/utils';
import { Accordion, Button, FootnoteText, HelpText } from '@/shared/ui';
import { IconButton } from '@/shared/ui/Buttons';
import { AssetBalance, AssetIcon, WalletAccountIcon } from '@/shared/ui-entities';
import { Copy, Tooltip } from '@/shared/ui-kit';
import { type MultisigOperation, accounts } from '@/domains/network';
import { ChainTitle, XcmChains } from '@/entities/chain';
import { networkModel, useNetworkData } from '@/entities/network';
import { OperationTitleStatus } from '@/entities/operations';
import { AssetFiatBalance } from '@/entities/price';
import {
  TransactionTitle,
  findCoreTransaction,
  getTransactionAmount,
  useTransactionAsset,
} from '@/entities/transaction';
import { accountUtils, walletModel } from '@/entities/wallet';
import { deepLinkModel } from '../model/deep-link';

import { OperationFullInfo } from './OperationFullInfo';
import { OperationIcon } from './OperationIcon';
import { ApproveTxModal } from './modals/ApproveTx';
import { RejectTxModal } from './modals/RejectTx';

type Props = {
  operation: MultisigOperation;
  multisigAccount: MultisigAccount | FlexibleMultisigAccount;
  isDefaultOpen?: boolean;
};

export type OperationTitle = {
  title?: string;
  amount?: {
    value: BN | string;
    asset: Asset | AssetByChains;
  };
  sourceChainId?: ChainId;
  destinationChainId?: ChainId; // For XCM transactions
};

export const operationTitleTransformer = createTransformer<
  {
    operation?: MultisigOperation;
    showCoreTransaction?: boolean;
    chains?: Record<ChainId, Chain>;
    asset?: Asset | null;
    t?: TFunction;
  },
  OperationTitle
>();

export const Operation = memo(({ operation, multisigAccount, isDefaultOpen = false }: Props) => {
  const { t } = useI18n();
  const chains = useUnit(networkModel.$chains);
  const wallets = useUnit(walletModel.$wallets);
  const allAccounts = useUnit(accounts.$list);
  const { api, chain } = useNetworkData(operation.chainId);

  const wallet = useMemo(
    () => wallets.find(w => w.id === multisigAccount.walletId),
    [wallets, multisigAccount.walletId],
  );
  const accountAddress = chain ? toAddress(multisigAccount.accountId, { prefix: chain.addressPrefix }) : undefined;

  const showCoreTransaction = accountUtils.isFlexibleMultisigAccount(multisigAccount);

  // Approve/Reject availability logic
  const hasAccount = allAccounts.some(a => {
    return a.accountId === operation.depositor && !accountUtils.isWatchOnlyAccount(a);
  });
  const isRejectAvailable = operation.status === 'pending' && hasAccount;
  const isFinalSigning = multisigAccount && operation.events.length === multisigAccount.threshold - 1;
  const isApproveAvailable =
    operation.status === 'pending' &&
    (!isFinalSigning || (operation.callData && validateCallData(operation.callData, operation.callHash)));
  const coreTx = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;
  const asset = useTransactionAsset(coreTx, operation.chainId);

  const deepLink = useMemo(
    () => deepLinkModel.generateMultisigOperationDeepLink(operation, multisigAccount),
    [operation, multisigAccount],
  );

  const externalTitle = useTransformer(operationTitleTransformer, {
    operation,
    showCoreTransaction,
    chains,
    asset,
    t,
  });

  let titleData: OperationTitle;
  if (externalTitle) {
    titleData = externalTitle;
  } else {
    const amount = coreTx ? getTransactionAmount(coreTx) : null;

    titleData = {
      title:
        coreTx?.section && coreTx?.method
          ? formatSectionAndMethod(coreTx.section, coreTx.method)
          : t('operations.titles.unknown'),
      amount: asset && amount ? { value: amount, asset } : undefined,
      sourceChainId: operation.chainId,
    };
  }

  return (
    <Accordion
      isDefaultOpen={isDefaultOpen}
      className="rounded bg-block-background-default transition-shadow hover:shadow-card-shadow focus-visible:shadow-card-shadow"
    >
      <Accordion.Button buttonClass="px-4 py-2" iconWrapper="px-1.5">
        <div className="flex h-[52px] w-full items-center gap-x-2 overflow-hidden">
          <div className="flex w-[500px] min-w-0 items-center gap-x-2">
            <OperationIcon operation={operation} account={multisigAccount} />

            <div className="flex flex-1 flex-col justify-center gap-y-0.5 overflow-hidden">
              {titleData.title && <TransactionTitle title={titleData.title} />}
              {titleData.sourceChainId &&
                (titleData.destinationChainId ? (
                  <XcmChains chainIdFrom={titleData.sourceChainId} chainIdTo={titleData.destinationChainId} />
                ) : (
                  <ChainTitle chainId={titleData.sourceChainId} fontClass="text-help-text text-text-tertiary" />
                ))}
            </div>

            {titleData.amount && (
              <div className="flex w-[240px] shrink-0 items-center gap-x-2">
                <AssetIcon asset={titleData.amount.asset} size={32} />
                <div className="flex flex-col items-start gap-y-0.5">
                  <AssetBalance value={titleData.amount.value} asset={titleData.amount.asset} />
                  <AssetFiatBalance
                    asset={titleData.amount.asset}
                    amount={titleData.amount.value}
                    className="text-help-text text-text-tertiary"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-between">
            {wallet && accountAddress ? (
              <div className="flex w-[240px] items-center gap-x-2">
                <WalletAccountIcon address={accountAddress} type={wallet.type} size={32} iconSize={14} />
                <div className="flex min-w-0 flex-col items-start gap-y-0.5">
                  <FootnoteText className="truncate text-text-primary">{wallet.name}</FootnoteText>
                  <HelpText className="text-text-tertiary">{toShortAddress(accountAddress, 6)}</HelpText>
                </div>
              </div>
            ) : (
              <div className="w-[240px]" />
            )}

            <OperationTitleStatus operation={operation} account={multisigAccount} />

            <div className="flex w-[140px] shrink-0 gap-x-2" onClick={e => e.stopPropagation()}>
              {isRejectAvailable && (
                <RejectTxModal api={api} operation={operation} account={multisigAccount} chain={chain}>
                  <Button pallet="error" variant="fill" size="sm" className="flex-1">
                    {t('operation.rejectButton')}
                  </Button>
                </RejectTxModal>
              )}
              {isApproveAvailable && (
                <ApproveTxModal api={api} operation={operation} account={multisigAccount} chain={chain}>
                  <Button size="sm" className="flex-1">
                    {t('operation.approveButton')}
                  </Button>
                </ApproveTxModal>
              )}
            </div>
          </div>

          <Tooltip>
            <Tooltip.Trigger>
              <Copy value={deepLink} notification={t('general.notifications.operationLinkCopied')}>
                <IconButton className="shrink-0 self-center text-icon-default" name="share" />
              </Copy>
            </Tooltip.Trigger>
            <Tooltip.Content>{t('operations.shareOperationTooltip')}</Tooltip.Content>
          </Tooltip>
        </div>
      </Accordion.Button>
      <Accordion.Content className="border-t border-divider">
        <OperationFullInfo operation={operation} account={multisigAccount} />
      </Accordion.Content>
    </Accordion>
  );
});
