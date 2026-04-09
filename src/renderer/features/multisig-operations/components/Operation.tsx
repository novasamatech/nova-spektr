import { type BN } from '@polkadot/util';
import { type TFunction } from 'i18next';
import { type ReactNode, memo, useMemo } from 'react';

import {
  type Address,
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
import { formatSectionAndMethod, toAddress, toShortAddress } from '@/shared/lib/utils';
import { Accordion, FootnoteText, HelpText } from '@/shared/ui';
import { IconButton } from '@/shared/ui/Buttons';
import { AssetBalance, AssetIcon, Identicon, WalletAccountIcon } from '@/shared/ui-entities';
import { AsyncItem, Copy, Tooltip } from '@/shared/ui-kit';
import { type MultisigOperation, useWalletName } from '@/domains/network';
import { ChainTitle, XcmChains } from '@/entities/chain';
import { OperationTitleStatus } from '@/entities/operations';
import {
  TransactionTitle,
  findCoreTransaction,
  getTransactionAmount,
  useTransactionAsset,
} from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';
import { AssetFiatBalance } from '@/widgets/price';
import { type TabFilter } from '../model/context';
import { deepLinkModel } from '../model/deep-link';

import { OperationActions } from './OperationActions';
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

const AccountInfoCell = memo(
  ({ icon, title, accountAddress }: { icon: ReactNode; title: string; accountAddress: Address }) => (
    <div className="flex w-[240px] items-center gap-x-2">
      {icon}
      <div className="flex min-w-0 flex-col items-start gap-y-0.5">
        <FootnoteText className="w-full truncate text-text-primary">{title}</FootnoteText>
        <HelpText className="text-text-tertiary">{toShortAddress(accountAddress, 6)}</HelpText>
      </div>
    </div>
  ),
);

const OperationWalletInfo = memo(({ wallet, accountAddress }: { wallet: Wallet; accountAddress: Address }) => {
  const walletName = useWalletName(wallet);

  return (
    <AccountInfoCell
      icon={<WalletAccountIcon address={accountAddress} type={wallet.type} size={32} iconSize={14} />}
      title={walletName ?? ''}
      accountAddress={accountAddress}
    />
  );
});

export const Operation = memo(({ operation, multisigAccount, isDefaultOpen = false, tab, chains, wallets }: Props) => {
  const { t } = useI18n();

  const wallet = useMemo(
    () => wallets.find(w => w.id === multisigAccount.walletId),
    [wallets, multisigAccount.walletId],
  );

  const isFlexibleMultisigAccount = accountUtils.isFlexibleMultisigAccount(multisigAccount);
  const coreTx = isFlexibleMultisigAccount ? findCoreTransaction(operation.transaction) : operation.transaction;
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
            <div className="flex w-[450px] min-w-0 items-center gap-x-2">
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
                    <AsyncItem strategy="idle" fallback={<div className="h-[18px]" />}>
                      <AssetFiatBalance
                        asset={titleData.amount.asset}
                        amount={titleData.amount.value}
                        className="text-help-text text-text-tertiary"
                      />
                    </AsyncItem>
                  </div>
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-1 items-center justify-between">
              {wallet && accountAddress ? (
                <OperationWalletInfo wallet={wallet} accountAddress={accountAddress} />
              ) : accountAddress ? (
                <AccountInfoCell
                  icon={<Identicon address={accountAddress} size={32} background={false} canCopy={false} />}
                  title={multisigAccount.name}
                  accountAddress={accountAddress}
                />
              ) : (
                <div className="w-[240px]" />
              )}

              <OperationTitleStatus operation={operation} account={multisigAccount} />

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
