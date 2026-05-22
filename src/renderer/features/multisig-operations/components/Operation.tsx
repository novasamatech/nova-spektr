import { type BN } from '@polkadot/util';
import { type TFunction } from 'i18next';
import { memo, useMemo } from 'react';

import {
  type Asset,
  type AssetByChains,
  type Chain,
  type ChainId,
  type FlexibleMultisigAccount,
  type MultisigAccount,
  type Wallet,
} from '@/shared/core';
import { createTransformer, useTransformer } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { formatSectionAndMethod, toAddress } from '@/shared/lib/utils';
import { Accordion, CaptionText } from '@/shared/ui';
import { IconButton } from '@/shared/ui/Buttons';
import { Copy, Tooltip } from '@/shared/ui-kit';
import { useIsDraftLinkedOperation, useOperationDescription } from '@/domains/backend';
import { type MultisigOperation } from '@/domains/network';
import { ChainTitle, XcmChains } from '@/entities/chain';
import { OperationTitleStatus } from '@/entities/operations';
import {
  TransactionTitle,
  findCoreTransaction,
  getTransactionAmount,
  useTransactionAsset,
} from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';
import { NamedAccount } from '@/widgets/NameResolver';
import { parseProxyEditOperation } from '../lib/proxy-edit';
import { parseVerifyProxyOperation } from '../lib/verify-proxy-op';
import { type TabFilter } from '../model/context';
import { deepLinkModel } from '../model/deep-link';
import { EditControllerOperationCard } from '../ui/EditControllerOperationCard';
import { VerifyProxyOperationCard } from '../ui/VerifyProxyOperationCard';

import { OperationActions } from './OperationActions';
import { OperationAmount } from './OperationAmount';
import { OperationFullInfo } from './OperationFullInfo';
import { OperationIcon } from './OperationIcon';

type Props = {
  operation: MultisigOperation;
  multisigAccount: MultisigAccount | FlexibleMultisigAccount;
  isDefaultOpen?: boolean;
  tab: TabFilter;
  chains: Record<ChainId, Chain>;
  wallets: Wallet[];
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
    operation: MultisigOperation | null;
    showCoreTransaction?: boolean;
    chains: Record<ChainId, Chain> | null;
    asset?: Asset | null;
    t?: TFunction;
  },
  OperationTitle
>();

export const Operation = memo(({ operation, multisigAccount, isDefaultOpen = false, tab, chains, wallets }: Props) => {
  const { t } = useI18n();
  const description = useOperationDescription(operation.id);
  const isDraftLinked = useIsDraftLinkedOperation(operation.id);

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

  let titleData: OperationTitle;
  if (externalTitle) {
    titleData = externalTitle;
  } else {
    const amount = coreTx ? getTransactionAmount(coreTx) : null;

    titleData = {
      title:
        coreTx?.section && coreTx?.method
          ? formatSectionAndMethod(coreTx.section, coreTx.method)
          : operation.section && operation.method
            ? formatSectionAndMethod(operation.section, operation.method)
            : t('operations.titles.unknown'),
      amount: asset && amount ? { value: amount, asset } : undefined,
      sourceChainId: operation.chainId,
    };
  }

  return (
    <div className="focus-active:shadow-card-shadow rounded bg-block-background-default transition-shadow hover:shadow-card-shadow">
      <Accordion isDefaultOpen={isDefaultOpen}>
        <Accordion.Button buttonClass="px-4 py-2">
          <div className="flex h-[52px] w-full items-center gap-x-2 overflow-hidden">
            {proxyEdit ? (
              <EditControllerOperationCard info={proxyEdit} chain={chains[operation.chainId]} />
            ) : verifyProxy ? (
              <VerifyProxyOperationCard
                info={verifyProxy}
                chain={chains[operation.chainId]}
                status={operation.status}
              />
            ) : (
              <div className="flex w-[450px] items-center gap-x-2">
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
                  <OperationAmount
                    value={titleData.amount.value}
                    asset={titleData.amount.asset}
                    className="w-[200px]"
                  />
                )}
              </div>
            )}

            <div className="flex min-w-0 flex-1 items-center justify-between">
              {accountAddress ? (
                <div className="flex min-w-[140px] flex-1 items-center">
                  <NamedAccount
                    accountId={multisigAccount.accountId}
                    chain={isFlexibleMultisigAccount ? chains[multisigAccount.chainId] : undefined}
                    wallet={wallet}
                    iconSize={32}
                    hideExplorers
                    variant="short"
                  />
                </div>
              ) : (
                <div className="min-w-[200px] flex-1" />
              )}

              <div className="flex shrink-0 items-center gap-x-2">
                <div className="w-[100px]">
                  {isDraftLinked && (
                    <Tooltip open={description ? undefined : false}>
                      <Tooltip.Trigger>
                        <div className="inline-flex items-center rounded-[20px] border border-icon-accent/30 bg-icon-accent/8 px-2.5 py-1">
                          <CaptionText className="text-icon-accent uppercase">
                            {t('operations.drafts.operationBadge')}
                          </CaptionText>
                        </div>
                      </Tooltip.Trigger>
                      <Tooltip.Content>{description}</Tooltip.Content>
                    </Tooltip>
                  )}
                </div>
                <OperationTitleStatus operation={operation} account={multisigAccount} />
              </div>

              <OperationActions operation={operation} account={multisigAccount} />
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
        <Accordion.Content>
          <div className="border-t border-divider">
            <OperationFullInfo operation={operation} account={multisigAccount} tab={tab} />
          </div>
        </Accordion.Content>
      </Accordion>
    </div>
  );
});
