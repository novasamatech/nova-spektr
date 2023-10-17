import cn from 'classnames';
import { useUnit } from 'effector-react';

import { useI18n } from '@renderer/app/providers';
import { AddressWithExplorers, WalletIcon, walletModel, WalletRow } from '@renderer/entities/wallet';
import { Icon, FootnoteText, DetailRow, CaptionText } from '@renderer/shared/ui';
import { useToggle } from '@renderer/shared/lib/hooks';
import { ExtendedChain } from '@renderer/entities/network';
import {
  MultisigTransaction,
  Transaction,
  TransactionType,
  isXcmTransaction,
  isTransferTransaction,
} from '@renderer/entities/transaction';
import ValidatorsModal from '@renderer/pages/Staking/Operations/components/Modals/ValidatorsModal/ValidatorsModal';
import { AddressStyle, DescriptionBlockStyle, InteractionStyle } from '../common/constants';
import { ChainTitle } from '@renderer/entities/chain';
import type { MultisigAccount } from '@renderer/shared/core';
import { Account } from '@renderer/shared/core';

type Props = {
  tx: MultisigTransaction;
  account?: MultisigAccount;
  signatory?: Account;
  connection?: ExtendedChain;
};

const Details = ({ tx, account, connection, signatory }: Props) => {
  const { t } = useI18n();
  const wallet = useUnit(walletModel.$activeWallet);

  const wallets = useUnit(walletModel.$wallets);
  const signatoryWallet = wallets.find((w) => w.id === signatory?.walletId);

  const [isValidatorsOpen, toggleValidators] = useToggle();

  const cancelDescription = tx.cancelDescription;

  const transaction =
    tx.transaction?.type === 'batchAll'
      ? tx.transaction.args.transactions.find(
          (tx: Transaction) => tx.type === TransactionType.BOND || tx.type === TransactionType.UNSTAKE,
        ) || tx.transaction.args.transactions[0]
      : tx.transaction;

  const startStakingValidators =
    tx.transaction?.type === 'batchAll' &&
    tx.transaction.args.transactions.find((tx: Transaction) => tx.type === 'nominate')?.args?.targets;

  const validators = transaction?.args.targets || startStakingValidators;

  const defaultAsset = connection?.assets[0];
  const addressPrefix = connection?.addressPrefix;
  const explorers = connection?.explorers;

  const hasSender = isXcmTransaction(tx.transaction) || isTransferTransaction(tx.transaction);

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

      {account && wallet && (
        <DetailRow label={t('operation.details.multisigWallet')}>
          <div className="flex gap-x-2 items-center max-w-none">
            <WalletIcon type={wallet.type} size={16} />
            <FootnoteText>{wallet.name}</FootnoteText>
          </div>
        </DetailRow>
      )}

      {account && (
        <DetailRow label={t('operation.details.' + hasSender ? 'sender' : 'account')} className="text-text-secondary">
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

      {signatory && signatoryWallet && (
        <DetailRow label={t('transfer.signatoryLabel')} className="text-text-secondary">
          <WalletRow
            wallet={signatoryWallet}
            accountId={signatory.accountId}
            addressPrefix={addressPrefix}
            explorers={explorers}
          />
        </DetailRow>
      )}

      {validators && defaultAsset && (
        <>
          <DetailRow label={t('operation.details.validators')}>
            <button
              type="button"
              className={cn('flex gap-x-1 items-center', InteractionStyle)}
              onClick={toggleValidators}
            >
              <div className="rounded-[30px] px-1.5 py-[1px] bg-icon-accent">
                <CaptionText className="text-white" align="center">
                  {validators.length}
                </CaptionText>
              </div>
              <Icon name="info" size={16} />
            </button>
          </DetailRow>
          <ValidatorsModal
            isOpen={isValidatorsOpen}
            validators={validators.map((address: string) => ({ address }))}
            explorers={connection?.explorers}
            onClose={toggleValidators}
          />
        </>
      )}

      <hr className="border-filter-border" />

      {isXcmTransaction(tx.transaction) && transaction.args.destinationChain && (
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
          className={transaction.args.payee.Account && 'text-text-secondary'}
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
