import { useUnit } from 'effector-react';
import { type TFunction } from 'i18next';
import { memo, useMemo } from 'react';

import {
  type Asset,
  type Chain,
  type ChainId,
  type DecodedTransaction,
  type FlexibleMultisigAccount,
  type MultisigAccount,
  type Wallet,
} from '@/shared/core';
import { createTransformer, useTransformer } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { cnTw, formatSectionAndMethod, toAddress } from '@/shared/lib/utils';
import { Accordion, CaptionText } from '@/shared/ui';
import { UnknownRecipientBadge } from '@/shared/ui-entities';
import { Tooltip } from '@/shared/ui-kit';
import { useIsDraftLinkedOperation, useOperationDescription } from '@/domains/backend';
import { type MultisigOperation } from '@/domains/network';
import { ChainTitle, XcmChains } from '@/entities/chain';
import { OperationTitleStatus, operationDetailsUtils } from '@/entities/operations';
import {
  TransactionTitle,
  findCoreTransaction,
  getTransactionAmount,
  useTransactionAsset,
} from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';
import {
  getCellProps,
  getLeftBlockProps,
  getRowProps,
  operationColumns,
  useOperationColumnVisibility,
  useOperationColumnWidths,
} from '@/aggregates/operations-table-layout';
import { recipientVerificationModel } from '@/aggregates/recipient-verification';
import { NamedAccount } from '@/widgets/NameResolver';
import { OperationAmount } from '@/widgets/transaction-amount';
import { parseProxyEditOperation } from '../lib/proxy-edit';
import { type OperationTitle } from '../lib/types';
import { parseVerifyProxyOperation } from '../lib/verify-proxy-op';
import { deepLinkModel } from '../model/deep-link';
import { EditControllerOperationCard } from '../ui/EditControllerOperationCard';
import { VerifyProxyOperationCard } from '../ui/VerifyProxyOperationCard';

import { OperationActions } from './OperationActions';
import { OperationDescriptionCell } from './OperationDescriptionCell';
import { OperationFullInfo } from './OperationFullInfo';
import { OperationIcon } from './OperationIcon';

type Props = {
  operation: MultisigOperation;
  multisigAccount: MultisigAccount | FlexibleMultisigAccount;
  isDefaultOpen?: boolean;
  chains: Record<ChainId, Chain>;
  wallets: Wallet[];
};

/**
 * Minimal context the title/icon transformers actually read off the operation.
 * Lets non-multisig callers (e.g. drafts) feed in a decoded transaction without
 * faking a full `MultisigOperation`.
 */
export type OperationTransformerContext = {
  transaction: DecodedTransaction | null;
  chainId: ChainId;
};

export const operationTitleTransformer = createTransformer<
  {
    operation: OperationTransformerContext | null;
    showCoreTransaction?: boolean;
    chains: Record<ChainId, Chain> | null;
    asset?: Asset | null;
    t?: TFunction;
  },
  OperationTitle
>();

export const Operation = memo(({ operation, multisigAccount, isDefaultOpen = false, chains, wallets }: Props) => {
  const { t } = useI18n();
  const description = useOperationDescription(operation.id);
  const isDraftLinked = useIsDraftLinkedOperation(operation.id);
  const widths = useOperationColumnWidths();
  const visibility = useOperationColumnVisibility();

  const resolveRecipientWarning = useUnit(recipientVerificationModel.$resolveWarning);
  const destinationAccountId = operationDetailsUtils.getDestinationAccountId(operation) ?? null;
  const recipientWarning = resolveRecipientWarning(destinationAccountId);

  const wallet = useMemo(
    () => wallets.find(w => w.id === multisigAccount.walletId),
    [wallets, multisigAccount.walletId],
  );

  const isFlexibleMultisigAccount = accountUtils.isFlexibleMultisigAccount(multisigAccount);
  const coreTx = isFlexibleMultisigAccount ? findCoreTransaction(operation.transaction) : operation.transaction;
  const proxyEdit = useMemo(() => parseProxyEditOperation(operation), [operation]);
  // verify-proxy and edit-flexible-controller are mutually exclusive — proxyEdit has priority
  // because its detection is stricter (batch + addProxy match), so we only test for the
  // verify-proxy ping when the edit detector returned null.
  const verifyProxy = useMemo(() => (proxyEdit ? null : parseVerifyProxyOperation(operation)), [operation, proxyEdit]);
  const addressPrefix = isFlexibleMultisigAccount ? chains[multisigAccount.chainId]?.addressPrefix : undefined;
  const accountAddress = toAddress(multisigAccount.accountId, { prefix: addressPrefix });
  const asset = useTransactionAsset(coreTx, operation.chainId);

  const deepLink = useMemo(() => deepLinkModel.generateMultisigOperationDeepLink(operation), [operation]);

  const externalTitle = useTransformer(operationTitleTransformer, {
    operation,
    showCoreTransaction: isFlexibleMultisigAccount,
    chains,
    asset,
    t,
  });

  // Memoised so the expanded row's `memo(OperationFullInfo)` sees the same `amount` reference between renders.
  const amount = useMemo(() => {
    const value = coreTx ? getTransactionAmount(coreTx) : null;

    return asset && value ? { value, asset } : undefined;
  }, [coreTx, asset]);

  let titleData: OperationTitle;
  if (externalTitle) {
    titleData = externalTitle;
  } else {
    titleData = {
      title:
        coreTx?.section && coreTx?.method
          ? formatSectionAndMethod(coreTx.section, coreTx.method)
          : operation.section && operation.method
            ? formatSectionAndMethod(operation.section, operation.method)
            : t('operations.titles.unknown'),
      amount,
      sourceChainId: operation.chainId,
    };
  }

  return (
    <div
      data-operation-id={operation.id}
      className="focus-active:shadow-card-shadow rounded bg-block-background-default transition-shadow hover:shadow-card-shadow"
    >
      <Accordion isDefaultOpen={isDefaultOpen}>
        {/* text-left: Disclosure.Button is a <button>, whose default centered
            text-align cascades into the address/description lines */}
        <Accordion.Button buttonClass="px-4 text-left">
          <div {...getRowProps('group/row')}>
            {proxyEdit ? (
              <div {...getLeftBlockProps(widths, visibility)}>
                <EditControllerOperationCard info={proxyEdit} chain={chains[operation.chainId]} />
              </div>
            ) : verifyProxy ? (
              <div {...getLeftBlockProps(widths, visibility)}>
                <VerifyProxyOperationCard
                  info={verifyProxy}
                  chain={chains[operation.chainId]}
                  status={operation.status}
                />
              </div>
            ) : (
              <div {...getLeftBlockProps(widths, visibility, 'gap-x-2')}>
                <OperationIcon operation={operation} account={multisigAccount} />

                <div
                  className={cnTw(operationColumns.titleCell, 'flex flex-col justify-center gap-y-0.5 overflow-hidden')}
                >
                  {titleData.title && <TransactionTitle title={titleData.title} />}
                  {titleData.sourceChainId &&
                    (titleData.destinationChainId ? (
                      <XcmChains chainIdFrom={titleData.sourceChainId} chainIdTo={titleData.destinationChainId} />
                    ) : (
                      <ChainTitle chainId={titleData.sourceChainId} fontClass="text-help-text text-text-tertiary" />
                    ))}
                </div>

                {visibility.value && (
                  <div {...getCellProps('value', widths)}>
                    {titleData.amount && (
                      <OperationAmount value={titleData.amount.value} asset={titleData.amount.asset} />
                    )}
                  </div>
                )}
              </div>
            )}

            {visibility.submitter && (
              <div {...getCellProps('submitter', widths)}>
                {accountAddress && (
                  <NamedAccount
                    accountId={multisigAccount.accountId}
                    chain={isFlexibleMultisigAccount ? chains[multisigAccount.chainId] : undefined}
                    wallet={wallet}
                    iconSize={28}
                    hideExplorers
                    variant="short"
                  />
                )}
              </div>
            )}

            {visibility.initiator && (
              <div {...getCellProps('initiator', widths)}>
                <NamedAccount
                  accountId={operation.depositor}
                  chain={chains[operation.chainId]}
                  walletNameAs="fallback"
                  iconSize={28}
                  hideExplorers
                  variant="short"
                />
              </div>
            )}

            {/* A hidden Description leaves the same flexible spacer behind so the trailing
                columns keep their place at the row's right edge. */}
            {visibility.description ? (
              <div className={cnTw(operationColumns.description, 'flex h-full items-center gap-x-2')}>
                {isDraftLinked && (
                  <Tooltip open={description ? undefined : false}>
                    <Tooltip.Trigger>
                      <div className="inline-flex shrink-0 items-center rounded-[20px] border border-icon-accent/30 bg-icon-accent/8 px-2.5 py-1">
                        <CaptionText className="text-icon-accent uppercase">
                          {t('operations.drafts.operationBadge')}
                        </CaptionText>
                      </div>
                    </Tooltip.Trigger>
                    <Tooltip.Content>{description}</Tooltip.Content>
                  </Tooltip>
                )}
                <div className="min-w-0 flex-1">
                  <OperationDescriptionCell operation={operation} chain={chains[operation.chainId]} />
                </div>
                <UnknownRecipientBadge warning={recipientWarning} variant="recipient" />
              </div>
            ) : (
              <div className={operationColumns.descriptionSpacer} />
            )}

            {visibility.status && (
              <div {...getCellProps('status', widths, 'justify-center')}>
                <OperationTitleStatus operation={operation} account={multisigAccount} className="mx-0 w-auto" />
              </div>
            )}

            {visibility.actions && (
              <div {...getCellProps('actions', widths, 'justify-end')}>
                <OperationActions operation={operation} account={multisigAccount} className="w-full" />
              </div>
            )}
          </div>
        </Accordion.Button>
        <Accordion.Content>
          <div className="border-t border-divider">
            <OperationFullInfo
              operation={operation}
              account={multisigAccount}
              wallet={wallet}
              amount={titleData.amount}
              deepLink={deepLink}
            />
          </div>
        </Accordion.Content>
      </Accordion>
    </div>
  );
});
