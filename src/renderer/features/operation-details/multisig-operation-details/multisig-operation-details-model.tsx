import { useStoreMap, useUnit } from 'effector-react';

import { createFeature } from '@/shared/effector';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { cnTw, copyToClipboard, toAddress, truncate } from '@/shared/lib/utils';
import { Button, DetailRow, FootnoteText, Icon } from '@/shared/ui';
import { AccountExplorers, Address } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { AssetBalance } from '@/entities/asset';
import { ChainTitle } from '@/entities/chain';
import { getTransactionFromMultisigTx } from '@/entities/multisig';
import { networkModel } from '@/entities/network';
import { InteractionStyle, Status, operationDetailsUtils, operationsModel } from '@/entities/operations';
import { signatoryUtils } from '@/entities/signatory';
import { TransactionTitle } from '@/entities/transaction';
import { ExplorersPopover, WalletCardSm, WalletIcon, accountUtils, walletModel } from '@/entities/wallet';
import { multisigOperationsFeature } from '@/features/multisig-operations';

export const multisigOperationDetailsFeature = createFeature({
  name: 'multisig/operation details',
});

multisigOperationDetailsFeature.inject(multisigOperationsFeature.slots.operationDetails, {
  render: ({ operation }) => {
    const { t } = useI18n();
    const chains = useUnit(networkModel.$chains);
    const activeWallet = useUnit(walletModel.$activeWallet);

    if (!activeWallet) return null;

    const accountId = activeWallet.accounts[0].accountId;
    const chain = chains[operation.chainId];

    return (
      <DetailRow label={t('operation.details.multisigWallet')}>
        <Box direction="row" gap={2}>
          <WalletIcon type={activeWallet.type} size={16} />
          <span>{activeWallet.name}</span>
          <AccountExplorers accountId={accountId} chain={chain} />
        </Box>
      </DetailRow>
    );
  },
  order: 0,
});

multisigOperationDetailsFeature.inject(multisigOperationsFeature.slots.operationTitle, {
  render: ({ operation }) => {
    const { formatDate } = useI18n();

    const events = useStoreMap({
      store: operationsModel.$multisigEvents,
      keys: [operation],
      fn: (events, [operation]) => {
        return events.filter(
          (e) =>
            e.txAccountId === operation.accountId &&
            e.txChainId === operation.chainId &&
            e.txCallHash === operation.callHash &&
            e.txBlock === operation.blockCreated &&
            e.txIndex === operation.indexCreated,
        );
      },
    });
    const approvals = events?.filter((e) => e.status === 'SIGNED') || [];
    const initEvent = approvals.find((e) => e.accountId === operation.depositor);
    const date = new Date(operation.dateCreated || initEvent?.dateCreated || Date.now());

    return (
      <div className="w-[58px] pr-1">
        <FootnoteText className="text-text-tertiary" align="right">
          {formatDate(date, 'p')}
        </FootnoteText>
      </div>
    );
  },
  order: 0,
});

multisigOperationDetailsFeature.inject(multisigOperationsFeature.slots.operationTitle, {
  render: ({ operation }) => {
    const transaction = getTransactionFromMultisigTx(operation);

    if (!transaction) {
      return (
        <>
          <TransactionTitle className="flex-1 overflow-hidden" tx={transaction} />

          <ChainTitle chainId={operation.chainId} className="w-[114px]" />
        </>
      );
    }

    return null;
  },
  order: 1,
});

multisigOperationDetailsFeature.inject(multisigOperationsFeature.slots.operationTitle, {
  render: ({ operation }) => {
    const events = useStoreMap({
      store: operationsModel.$multisigEvents,
      keys: [operation],
      fn: (events, [operation]) => {
        return events.filter(
          (e) =>
            e.txAccountId === operation.accountId &&
            e.txChainId === operation.chainId &&
            e.txCallHash === operation.callHash &&
            e.txBlock === operation.blockCreated &&
            e.txIndex === operation.indexCreated,
        );
      },
    });

    const approvals = events?.filter((e) => e.status === 'SIGNED') || [];
    const activeWallet = useUnit(walletModel.$activeWallet);
    const account = activeWallet?.accounts.find(accountUtils.isMultisigAccount);

    return (
      <div className="flex w-[120px] justify-end">
        <Status status={operation.status} signed={approvals.length} threshold={account?.threshold || 0} />
      </div>
    );
  },
  order: 2,
});

multisigOperationDetailsFeature.inject(multisigOperationsFeature.slots.operationDetails, {
  render: ({ operation }) => {
    const { t } = useI18n();

    const wallets = useUnit(walletModel.$wallets);
    const activeWallet = useUnit(walletModel.$activeWallet);
    const chains = useUnit(networkModel.$chains);
    const chain = chains[operation.chainId];
    const account = activeWallet?.accounts.find(accountUtils.isMultisigAccount);

    const defaultAsset = chain?.assets[0];
    const addressPrefix = chain?.addressPrefix;
    const explorers = chain?.explorers;

    const [isAdvancedShown, toggleAdvanced] = useToggle();

    const { indexCreated, blockCreated, deposit, depositor, callHash, callData } = operation;

    const depositorSignatory = account?.signatories.find((s) => s.accountId === depositor);
    const extrinsicLink = operationDetailsUtils.getMultisigExtrinsicLink(
      callHash,
      indexCreated,
      blockCreated,
      explorers,
    );

    const valueClass = 'text-text-secondary';
    const depositorWallet =
      depositorSignatory && signatoryUtils.getSignatoryWallet(wallets, depositorSignatory.accountId);

    return (
      <>
        <Button
          variant="text"
          pallet="primary"
          size="sm"
          suffixElement={<Icon name={isAdvancedShown ? 'up' : 'down'} size={16} />}
          className="-ml-2 w-fit text-action-text-default hover:text-action-text-default"
          onClick={toggleAdvanced}
        >
          {t('operation.advanced')}
        </Button>

        {isAdvancedShown && (
          <>
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
                <div className="-mr-2">
                  {depositorWallet ? (
                    <ExplorersPopover
                      button={<WalletCardSm wallet={depositorWallet} />}
                      address={depositorSignatory.accountId}
                      explorers={explorers}
                      addressPrefix={addressPrefix}
                    />
                  ) : (
                    <div className="flex min-w-min">
                      <FootnoteText className="w-[180px] text-text-secondary">
                        <Address
                          address={toAddress(depositorSignatory.accountId, { prefix: addressPrefix })}
                          variant="short"
                          showIcon
                        />
                      </FootnoteText>
                      <AccountExplorers accountId={depositorSignatory.accountId} chain={chain} />
                    </div>

                    // <AddressWithExplorers
                    //   explorers={explorers}
                    //   accountId={depositorSignatory.accountId}
                    //   name={depositorSignatory.name}
                    //   addressFont={AddressStyle}
                    //   addressPrefix={addressPrefix}
                    //   wrapperClassName="min-w-min"
                    //   type="short"
                    // />
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
          </>
        )}
      </>
    );
  },
  order: 999,
});
