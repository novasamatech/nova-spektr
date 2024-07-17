import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { useI18n } from '@app/providers';

import {
  type Account,
  type Address,
  type MultisigAccount,
  type MultisigTransaction,
  type Transaction,
  type Validator,
  type Wallet,
} from '@shared/core';
import { useToggle } from '@shared/lib/hooks';
import { cnTw, toAccountId } from '@shared/lib/utils';
import { CaptionText, DetailRow, FootnoteText, Icon } from '@shared/ui';

import { ChainTitle } from '@entities/chain';
import { getTransactionFromMultisigTx } from '@entities/multisig';
import { type ExtendedChain, networkModel, networkUtils } from '@entities/network';
import { proxyUtils } from '@entities/proxy';
import { SelectedValidatorsModal, useValidatorsMap } from '@entities/staking';
import {
  isAddProxyTransaction,
  isManageProxyTransaction,
  isProxyTransaction,
  isRemoveProxyTransaction,
  isRemovePureProxyTransaction,
  isTransferTransaction,
  isXcmTransaction,
} from '@entities/transaction';
import { AddressWithExplorers, ExplorersPopover, WalletCardSm, WalletIcon, walletModel } from '@entities/wallet';

import { AddressStyle, DescriptionBlockStyle, InteractionStyle } from '../common/constants';
import { getDelegate, getDestination, getDestinationChain, getPayee, getProxyType, getSpawner } from '../common/utils';

type Props = {
  tx: MultisigTransaction;
  account?: MultisigAccount;
  signatory?: Account;
  extendedChain?: ExtendedChain;
};

export const Details = ({ tx, account, extendedChain, signatory }: Props) => {
  const { t } = useI18n();

  const activeWallet = useUnit(walletModel.$activeWallet);
  const wallets = useUnit(walletModel.$wallets);
  const chains = useUnit(networkModel.$chains);

  const payee = getPayee(tx);
  const spawner = getSpawner(tx);
  const delegate = getDelegate(tx);
  const proxyType = getProxyType(tx);
  const destinationChain = getDestinationChain(tx);
  const destination = getDestination(tx, chains, destinationChain);

  const signatoryWallet = wallets.find((w) => w.id === signatory?.walletId);

  const api = extendedChain?.api;
  const connection = extendedChain?.connection;
  const defaultAsset = extendedChain?.assets[0];
  const addressPrefix = extendedChain?.addressPrefix;
  const explorers = extendedChain?.explorers;

  const validatorsMap = useValidatorsMap(api, connection && networkUtils.isLightClientConnection(connection));

  const [isValidatorsOpen, toggleValidators] = useToggle();

  const cancelDescription = tx.cancelDescription;
  const allValidators = Object.values(validatorsMap);

  const transaction = getTransactionFromMultisigTx(tx);

  const startStakingValidators: Address[] =
    (tx.transaction?.type === 'batchAll' &&
      tx.transaction.args.transactions.find((tx: Transaction) => tx.type === 'nominate')?.args?.targets) ||
    [];

  const selectedValidators: Validator[] =
    allValidators.filter((v) => (transaction?.args.targets || startStakingValidators).includes(v.address)) || [];

  const proxied = useMemo((): { wallet: Wallet; account: Account } | undefined => {
    if (!tx.transaction || !isProxyTransaction(tx.transaction)) {
      return undefined;
    }

    const proxiedAccountId = toAccountId(tx.transaction.args.real);
    const { wallet, account } = wallets.reduce<{ wallet?: Wallet; account?: Account }>(
      (acc, wallet) => {
        if (acc.wallet) {
          return acc;
        }

        const account = wallet.accounts.find((account) => account.accountId === proxiedAccountId);

        return { wallet, account };
      },
      { wallet: undefined, account: undefined },
    );

    if (!wallet || !account) {
      return undefined;
    }

    return { wallet, account };
  }, [tx, wallets]);

  const hasSender = isXcmTransaction(tx.transaction) || isTransferTransaction(tx.transaction);

  const isDividerVisible =
    (isXcmTransaction(tx.transaction) && transaction?.args.destinationChain) ||
    isManageProxyTransaction(tx.transaction) ||
    destination ||
    transaction?.args.payee;

  return (
    <dl className="flex flex-col gap-y-4 w-full">
      {cancelDescription && (
        <div className={DescriptionBlockStyle}>
          <FootnoteText as="dt" className="text-text-tertiary">
            {t('operation.details.rejectReason')}
          </FootnoteText>
          <FootnoteText as="dd" className="break-words">
            {cancelDescription}
          </FootnoteText>
        </div>
      )}

      {proxied && (
        <>
          <DetailRow label={t('operation.details.senderProxiedWallet')}>
            <div className="flex gap-x-2 items-center max-w-none">
              <WalletIcon type={proxied.wallet.type} size={16} />
              <FootnoteText>{proxied.wallet.name}</FootnoteText>
            </div>
          </DetailRow>

          <DetailRow label={t('operation.details.senderAccount')} className="text-text-secondary">
            <AddressWithExplorers
              explorers={explorers}
              addressFont={AddressStyle}
              type="short"
              accountId={proxied.account.accountId}
              addressPrefix={addressPrefix}
              wrapperClassName="-mr-2 min-w-min"
            />
          </DetailRow>

          <hr className="border-filter-border" />
        </>
      )}

      {account && activeWallet && (
        <DetailRow label={t('operation.details.multisigWallet')}>
          <div className="flex gap-x-2 items-center max-w-none">
            <WalletIcon type={activeWallet.type} size={16} />
            <FootnoteText>{activeWallet.name}</FootnoteText>
          </div>
        </DetailRow>
      )}

      {signatory && signatoryWallet && (
        <DetailRow label={t('transfer.signatoryLabel')} className="text-text-secondary -mr-2">
          <ExplorersPopover
            button={<WalletCardSm wallet={signatoryWallet} />}
            address={signatory.accountId}
            explorers={explorers}
            addressPrefix={addressPrefix}
          />
        </DetailRow>
      )}

      {account && (
        <DetailRow
          label={t(hasSender ? 'operation.details.sender' : 'operation.details.account')}
          className="text-text-secondary"
        >
          <AddressWithExplorers
            explorers={explorers}
            addressFont={AddressStyle}
            type="short"
            accountId={account.accountId}
            addressPrefix={addressPrefix}
            wrapperClassName="-mr-2 min-w-min"
          />
        </DetailRow>
      )}

      {Boolean(selectedValidators.length) && defaultAsset && (
        <>
          <DetailRow label={t('operation.details.validators')}>
            <button
              type="button"
              className={cnTw('flex gap-x-1 items-center', InteractionStyle)}
              onClick={toggleValidators}
            >
              <div className="rounded-[30px] px-1.5 py-[1px] bg-icon-accent">
                <CaptionText className="text-white" align="center">
                  {selectedValidators.length}
                </CaptionText>
              </div>
              <Icon name="info" size={16} />
            </button>
          </DetailRow>
          <SelectedValidatorsModal
            isOpen={isValidatorsOpen}
            validators={selectedValidators}
            onClose={toggleValidators}
          />
        </>
      )}

      {isDividerVisible && <hr className="border-filter-border" />}

      {isAddProxyTransaction(transaction) && delegate && (
        <DetailRow label={t('operation.details.delegateTo')} className="text-text-secondary">
          <AddressWithExplorers
            explorers={explorers}
            addressFont={AddressStyle}
            type="short"
            address={delegate}
            addressPrefix={addressPrefix}
            wrapperClassName="-mr-2 min-w-min"
          />
        </DetailRow>
      )}

      {isRemoveProxyTransaction(transaction) && delegate && (
        <DetailRow label={t('operation.details.revokeFor')} className="text-text-secondary">
          <AddressWithExplorers
            explorers={explorers}
            addressFont={AddressStyle}
            type="short"
            address={delegate}
            addressPrefix={addressPrefix}
            wrapperClassName="-mr-2 min-w-min"
          />
        </DetailRow>
      )}

      {isRemovePureProxyTransaction(transaction) && proxyType && spawner && (
        <>
          <DetailRow label={t('operation.details.revokeAccessType')}>
            <FootnoteText className="text-text-secondary">{t(proxyUtils.getProxyTypeName(proxyType))}</FootnoteText>
          </DetailRow>
          <DetailRow label={t('operation.details.revokeFor')} className="text-text-secondary">
            <AddressWithExplorers
              explorers={explorers}
              addressFont={AddressStyle}
              type="short"
              accountId={spawner}
              addressPrefix={addressPrefix}
              wrapperClassName="-mr-2 min-w-min"
            />
          </DetailRow>
        </>
      )}

      {isManageProxyTransaction(transaction) && proxyType && (
        <DetailRow label={t('operation.details.accessType')}>
          <FootnoteText className="text-text-secondary">{t(proxyUtils.getProxyTypeName(proxyType))}</FootnoteText>
        </DetailRow>
      )}

      {isXcmTransaction(tx.transaction) && destinationChain && (
        <DetailRow label={t('operation.details.toNetwork')}>
          <ChainTitle chainId={destinationChain} />
        </DetailRow>
      )}

      {destination && (
        <DetailRow label={t('operation.details.recipient')} className="text-text-secondary">
          <AddressWithExplorers
            type="short"
            explorers={explorers}
            addressFont={AddressStyle}
            address={destination}
            addressPrefix={addressPrefix}
            wrapperClassName="-mr-2 min-w-min"
          />
        </DetailRow>
      )}

      {payee && (
        <DetailRow
          label={t('operation.details.payee')}
          className={typeof payee === 'string' ? 'pr-0' : 'text-text-secondary'}
        >
          {typeof payee === 'string' ? (
            payee
          ) : (
            <AddressWithExplorers
              explorers={explorers}
              addressFont={AddressStyle}
              type="short"
              address={payee.Account}
              addressPrefix={addressPrefix}
              wrapperClassName="-mr-2 min-w-min"
            />
          )}
        </DetailRow>
      )}

      <hr className="border-filter-border" />
    </dl>
  );
};
