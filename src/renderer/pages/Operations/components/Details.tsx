import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { AddressWithExplorers, WalletCardSm, WalletIcon, walletModel } from '@entities/wallet';
import { Icon, FootnoteText, DetailRow, CaptionText } from '@shared/ui';
import { useToggle } from '@shared/lib/hooks';
import { MultisigTransaction, Transaction, isXcmTransaction, isTransferTransaction } from '@entities/transaction';
import { cnTw } from '@shared/lib/utils';
import { ExtendedChain, isLightClient } from '@entities/network';
import { AddressStyle, DescriptionBlockStyle, InteractionStyle } from '../common/constants';
import { ChainTitle } from '@entities/chain';
import { Account } from '@shared/core';
import { getTransactionFromMultisigTx } from '@entities/multisig';
import type { Address, MultisigAccount, Validator } from '@shared/core';
import { useValidatorsMap, SelectedValidatorsModal } from '@entities/staking';

type Props = {
  tx: MultisigTransaction;
  account?: MultisigAccount;
  signatory?: Account;
  extendedChain?: ExtendedChain;
};

const Details = ({ tx, account, extendedChain, signatory }: Props) => {
  const { t } = useI18n();

  const activeWallet = useUnit(walletModel.$activeWallet);
  const wallets = useUnit(walletModel.$wallets);

  const signatoryWallet = wallets.find((w) => w.id === signatory?.walletId);

  const api = extendedChain?.api;
  const connection = extendedChain?.connection;
  const defaultAsset = extendedChain?.assets[0];
  const addressPrefix = extendedChain?.addressPrefix;
  const explorers = extendedChain?.explorers;

  const validatorsMap = useValidatorsMap(api, connection && isLightClient(connection));

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

  const hasSender = isXcmTransaction(tx.transaction) || isTransferTransaction(tx.transaction);

  const isDidverVisible =
    (isXcmTransaction(tx.transaction) && transaction?.args.destinationChain) ||
    transaction?.args.dest ||
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
          <WalletCardSm
            wallet={signatoryWallet}
            accountId={signatory.accountId}
            addressPrefix={addressPrefix}
            explorers={explorers}
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

      {isDidverVisible && <hr className="border-filter-border" />}

      {isXcmTransaction(tx.transaction) && transaction?.args.destinationChain && (
        <DetailRow label={t('operation.details.toNetwork')}>
          <ChainTitle chainId={transaction?.args.destinationChain} />
        </DetailRow>
      )}

      {transaction?.args.dest && (
        <DetailRow label={t('operation.details.recipient')} className="text-text-secondary">
          <AddressWithExplorers
            type="short"
            explorers={explorers}
            addressFont={AddressStyle}
            accountId={transaction.args.dest}
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
export default Details;
