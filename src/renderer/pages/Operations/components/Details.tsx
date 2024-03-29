import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { useI18n } from '@app/providers';
import { AddressWithExplorers, WalletCardSm, WalletIcon, walletModel, ExplorersPopover } from '@entities/wallet';
import { Icon, FootnoteText, DetailRow, CaptionText } from '@shared/ui';
import { useToggle } from '@shared/lib/hooks';
import { cnTw, toAccountId } from '@shared/lib/utils';
import { ExtendedChain, networkUtils } from '@entities/network';
import { AddressStyle, DescriptionBlockStyle, InteractionStyle } from '../common/constants';
import { ChainTitle } from '@entities/chain';
import { Account, Wallet } from '@shared/core';
import { getTransactionFromMultisigTx } from '@entities/multisig';
import type { Address, MultisigAccount, ProxyType, Validator } from '@shared/core';
import { useValidatorsMap, SelectedValidatorsModal } from '@entities/staking';
import { proxyUtils } from '@entities/proxy';
import { getDestination } from '../common/utils';
import {
  MultisigTransaction,
  Transaction,
  isXcmTransaction,
  isTransferTransaction,
  isManageProxyTransaction,
  isAddProxyTransaction,
  isRemoveProxyTransaction,
  isProxyTransaction,
} from '@entities/transaction';

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
  const accounts = useUnit(walletModel.$accounts);

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
    if (!tx.transaction || !isProxyTransaction(tx.transaction)) return undefined;

    const proxiedAccountId = toAccountId(tx.transaction.args.real);
    const proxiedAccount = accounts.find((account) => account.accountId === proxiedAccountId);
    const proxiedWallet = wallets.find((wallet) => wallet.id === proxiedAccount?.walletId);

    if (!proxiedAccount || !proxiedWallet) return undefined;

    return { wallet: proxiedWallet, account: proxiedAccount };
  }, [tx, wallets, accounts]);

  const destination = useMemo(() => getDestination(tx), [tx]);

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
            explorers={explorers}
            onClose={toggleValidators}
          />
        </>
      )}

      {isDividerVisible && <hr className="border-filter-border" />}

      {isAddProxyTransaction(tx.transaction) && (
        <DetailRow label={t('operation.details.delegateTo')} className="text-text-secondary">
          <AddressWithExplorers
            explorers={explorers}
            addressFont={AddressStyle}
            type="short"
            accountId={transaction?.args.delegate}
            addressPrefix={addressPrefix}
            wrapperClassName="-mr-2 min-w-min"
          />
        </DetailRow>
      )}

      {isRemoveProxyTransaction(tx.transaction) && (
        <DetailRow label={t('operation.details.revokeFor')} className="text-text-secondary">
          <AddressWithExplorers
            explorers={explorers}
            addressFont={AddressStyle}
            type="short"
            accountId={transaction?.args.delegate}
            addressPrefix={addressPrefix}
            wrapperClassName="-mr-2 min-w-min"
          />
        </DetailRow>
      )}

      {isManageProxyTransaction(tx.transaction) && (
        <DetailRow label={t('operation.details.accessType')}>
          <FootnoteText className="text-text-secondary">
            {t(proxyUtils.getProxyTypeName(transaction?.args.proxyType as ProxyType))}
          </FootnoteText>
        </DetailRow>
      )}

      {isXcmTransaction(tx.transaction) && transaction?.args.destinationChain && (
        <DetailRow label={t('operation.details.toNetwork')}>
          <ChainTitle chainId={transaction?.args.destinationChain} />
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

      {transaction?.args.payee && (
        <DetailRow
          label={t('operation.details.payee')}
          className={transaction.args.payee.Account ? 'text-text-secondary' : 'pr-0'}
        >
          {transaction.args.payee.Account ? (
            <AddressWithExplorers
              explorers={explorers}
              addressFont={AddressStyle}
              type="short"
              address={transaction.args.payee.Account}
              addressPrefix={addressPrefix}
              wrapperClassName="-mr-2 min-w-min"
            />
          ) : (
            transaction.args.payee
          )}
        </DetailRow>
      )}

      <hr className="border-filter-border" />
    </dl>
  );
};
