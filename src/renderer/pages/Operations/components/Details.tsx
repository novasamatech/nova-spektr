import { useUnit } from 'effector-react';

import { useI18n } from '@renderer/app/providers';
import { AddressWithExplorers, WalletCardSm, WalletIcon, walletModel } from '@renderer/entities/wallet';
import { Icon, FootnoteText, DetailRow, CaptionText } from '@renderer/shared/ui';
import { useToggle } from '@renderer/shared/lib/hooks';
import {
  MultisigTransaction,
  Transaction,
  isXcmTransaction,
  isTransferTransaction,
} from '@renderer/entities/transaction';
import { cnTw, getAssetById } from '@renderer/shared/lib/utils';
import { chainsService, ExtendedChain, isLightClient } from '@renderer/entities/network';
import { AddressStyle, DescriptionBlockStyle, InteractionStyle } from '../common/constants';
import { ChainTitle } from '@renderer/entities/chain';
import { Account } from '@renderer/shared/core';
import { getTransactionFromMultisigTx } from '@renderer/entities/multisig';
import type { Address, MultisigAccount, Validator } from '@renderer/shared/core';
import { useValidatorsMap, ValidatorsModal } from '@renderer/entities/staking';

type Props = {
  tx: MultisigTransaction;
  account?: MultisigAccount;
  signatory?: Account;
  connection?: ExtendedChain;
};

const Details = ({ tx, account, connection, signatory }: Props) => {
  const { t } = useI18n();
  const activeWallet = useUnit(walletModel.$activeWallet);

  const wallets = useUnit(walletModel.$wallets);
  const signatoryWallet = wallets.find((w) => w.id === signatory?.walletId);

  const api = connection?.api;
  const chainId = connection?.chainId;

  const allValidators = Object.values(useValidatorsMap(api, chainId, connection && isLightClient(connection)));

  const [isValidatorsOpen, toggleValidators] = useToggle();
  const asset =
    tx.transaction && getAssetById(tx.transaction.args.asset, chainsService.getChainById(tx.chainId)?.assets);

  const cancelDescription = tx.cancelDescription;

  const transaction = getTransactionFromMultisigTx(tx);

  const startStakingValidators: Address[] =
    (tx.transaction?.type === 'batchAll' &&
      tx.transaction.args.transactions.find((tx: Transaction) => tx.type === 'nominate')?.args?.targets) ||
    [];

  const selectedValidators: Validator[] =
    transaction?.args.targets || allValidators.filter((v) => startStakingValidators.includes(v.address)) || [];
  const selectedValidatorsAddress = selectedValidators.map((validator) => validator.address);
  const notSelectedValidators = allValidators.filter((v) => !selectedValidatorsAddress.includes(v.address));

  const defaultAsset = connection?.assets[0];
  const addressPrefix = connection?.addressPrefix;
  const explorers = connection?.explorers;

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
          <ValidatorsModal
            isOpen={isValidatorsOpen}
            asset={asset}
            selectedValidators={selectedValidators}
            notSelectedValidators={notSelectedValidators}
            explorers={connection?.explorers}
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
