import cn from 'classnames';
import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { AddressWithExplorers, WalletCardSm, walletModel, ExplorersPopover } from '@entities/wallet';
import { Icon, Button, FootnoteText, DetailRow } from '@shared/ui';
import { copyToClipboard, truncate, cnTw, getAssetById } from '@shared/lib/utils';
import { useToggle } from '@shared/lib/hooks';
import { ExtendedChain, networkUtils } from '@entities/network';
import { AddressStyle, DescriptionBlockStyle, InteractionStyle } from '../common/constants';
import { AssetBalance } from '@entities/asset';
import { ChainTitle } from '@entities/chain';
import type { Address, MultisigAccount, Validator } from '@shared/core';
import { getTransactionFromMultisigTx } from '@entities/multisig';
import { useValidatorsMap, ValidatorsModal } from '@entities/staking';
import { singnatoryUtils } from '@entities/signatory';
import { chainsService } from '@shared/api/network';
import { proxyUtils } from '@entities/proxy';
import { matrixModel } from '@entities/matrix';
import {
  getMultisigExtrinsicLink,
  getDestination,
  getPayee,
  getDelegate,
  getDestinationChain,
  getReal,
  getProxyType,
} from '../common/utils';
import {
  MultisigTransaction,
  Transaction,
  TransactionType,
  isAddProxyTransaction,
  isManageProxyTransaction,
  isRemoveProxyTransaction,
  isRemovePureProxyTransaction,
  isXcmTransaction,
} from '@entities/transaction';

type Props = {
  tx: MultisigTransaction;
  account?: MultisigAccount;
  extendedChain?: ExtendedChain;
};

export const OperationCardDetails = ({ tx, account, extendedChain }: Props) => {
  const { t } = useI18n();
  const matrix = useUnit(matrixModel.$matrix);

  const activeWallet = useUnit(walletModel.$activeWallet);
  const wallets = useUnit(walletModel.$wallets);
  const accounts = useUnit(walletModel.$accounts);

  const real = getReal(tx);
  const payee = getPayee(tx);
  const delegate = getDelegate(tx);
  const proxyType = getProxyType(tx);
  const destination = getDestination(tx);
  const destinationChain = getDestinationChain(tx);

  const api = extendedChain?.api;
  const defaultAsset = extendedChain?.assets[0];
  const addressPrefix = extendedChain?.addressPrefix;
  const explorers = extendedChain?.explorers;
  const connection = extendedChain?.connection;

  const [isAdvancedShown, toggleAdvanced] = useToggle();
  const [isValidatorsOpen, toggleValidators] = useToggle();

  const { indexCreated, blockCreated, deposit, depositor, callHash, callData, description, cancelDescription } = tx;

  const transaction = getTransactionFromMultisigTx(tx);
  const validatorsMap = useValidatorsMap(api, connection && networkUtils.isLightClientConnection(connection));

  const allValidators = Object.values(validatorsMap);

  const startStakingValidators: Address[] =
    (tx.transaction?.type === TransactionType.BATCH_ALL &&
      tx.transaction.args.transactions.find((tx: Transaction) => tx.type === TransactionType.NOMINATE)?.args
        ?.targets) ||
    [];

  const selectedValidators: Validator[] =
    allValidators.filter((v) => (transaction?.args.targets || startStakingValidators).includes(v.address)) || [];
  const selectedValidatorsAddress = selectedValidators.map((validator) => validator.address);
  const notSelectedValidators = allValidators.filter((v) => !selectedValidatorsAddress.includes(v.address));

  const depositorSignatory = account?.signatories.find((s) => s.accountId === depositor);
  const extrinsicLink = getMultisigExtrinsicLink(callHash, indexCreated, blockCreated, explorers);
  const validatorsAsset =
    transaction && getAssetById(transaction.args.asset, chainsService.getChainById(tx.chainId)?.assets);

  const valueClass = 'text-text-secondary';
  const depositorWallet =
    depositorSignatory && singnatoryUtils.getSignatoryWallet(wallets, accounts, depositorSignatory.accountId);

  return (
    <dl className="flex flex-col gap-y-1 w-full">
      {description && (
        <div className={DescriptionBlockStyle}>
          <FootnoteText as="dt" className="text-text-tertiary">
            {t('operation.details.description')}
          </FootnoteText>
          <FootnoteText as="dd" className={cnTw('break-words', valueClass)}>
            {description}
          </FootnoteText>
        </div>
      )}
      {cancelDescription && (
        <div className={DescriptionBlockStyle}>
          <FootnoteText as="dt" className="text-text-tertiary">
            {t('operation.details.rejectReason')}
          </FootnoteText>
          <FootnoteText as="dd" className={cnTw('break-words', valueClass)}>
            {cancelDescription}
          </FootnoteText>
        </div>
      )}

      {account && activeWallet && (
        <DetailRow label={t('operation.details.multisigWallet')} className={valueClass}>
          <div className="-mr-2">
            <ExplorersPopover
              button={<WalletCardSm wallet={activeWallet} />}
              address={account.accountId}
              explorers={explorers}
              addressPrefix={addressPrefix}
            />
          </div>
        </DetailRow>
      )}

      {isXcmTransaction(transaction) && (
        <>
          {account && (
            <DetailRow label={t('operation.details.sender')} className={valueClass}>
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

          <DetailRow label={t('operation.details.fromNetwork')} className={valueClass}>
            <ChainTitle chainId={tx.chainId} fontClass={valueClass} />
          </DetailRow>

          {destinationChain && (
            <DetailRow label={t('operation.details.toNetwork')} className={valueClass}>
              <ChainTitle chainId={destinationChain} fontClass={valueClass} />
            </DetailRow>
          )}
        </>
      )}

      {destination && (
        <DetailRow label={t('operation.details.recipient')} className={valueClass}>
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

      {isAddProxyTransaction(transaction) && delegate && (
        <DetailRow label={t('operation.details.delegateTo')} className={valueClass}>
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
        <DetailRow label={t('operation.details.revokeFor')} className={valueClass}>
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

      {isRemovePureProxyTransaction(transaction) && real && (
        <DetailRow label={t('operation.details.revokeFor')} className={valueClass}>
          <AddressWithExplorers
            explorers={explorers}
            addressFont={AddressStyle}
            type="short"
            address={real}
            addressPrefix={addressPrefix}
            wrapperClassName="-mr-2 min-w-min"
          />
        </DetailRow>
      )}

      {isManageProxyTransaction(transaction) && proxyType && (
        <DetailRow label={t('operation.details.accessType')} className={valueClass}>
          <FootnoteText className={valueClass}>{t(proxyUtils.getProxyTypeName(proxyType))}</FootnoteText>
        </DetailRow>
      )}

      {Boolean(selectedValidators?.length) && defaultAsset && (
        <>
          <DetailRow label={t('operation.details.validators')} className={valueClass}>
            <button
              type="button"
              className={cn('flex gap-x-1 items-center text-text-secondary', InteractionStyle)}
              onClick={toggleValidators}
            >
              <FootnoteText as="span" className="text-inherit">
                {selectedValidators.length}
              </FootnoteText>
              <Icon name="info" size={16} />
            </button>
          </DetailRow>
          <ValidatorsModal
            isOpen={isValidatorsOpen}
            asset={validatorsAsset}
            selectedValidators={selectedValidators}
            notSelectedValidators={notSelectedValidators}
            explorers={extendedChain?.explorers}
            onClose={toggleValidators}
          />
        </>
      )}

      {payee && (
        <DetailRow label={t('operation.details.payee')} className={valueClass}>
          {typeof payee === 'string' ? (
            payee
          ) : (
            <AddressWithExplorers
              type="short"
              explorers={explorers}
              addressFont={AddressStyle}
              address={payee.account}
              addressPrefix={addressPrefix}
              wrapperClassName="-mr-2 min-w-min"
            />
          )}
        </DetailRow>
      )}

      <Button
        variant="text"
        pallet="primary"
        size="sm"
        suffixElement={<Icon name={isAdvancedShown ? 'up' : 'down'} size={16} />}
        className="text-action-text-default hover:text-action-text-default w-fit -ml-2"
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
                className={cn('flex gap-x-1 items-center group', InteractionStyle)}
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
                className={cn('flex gap-x-1 items-center group', InteractionStyle)}
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
              {depositorWallet ? (
                <ExplorersPopover
                  button={<WalletCardSm wallet={depositorWallet} />}
                  address={depositorSignatory.accountId}
                  explorers={explorers}
                  addressPrefix={addressPrefix}
                />
              ) : (
                <AddressWithExplorers
                  explorers={explorers}
                  accountId={depositorSignatory.accountId}
                  name={depositorSignatory.name}
                  addressFont={AddressStyle}
                  addressPrefix={addressPrefix}
                  matrixId={matrix.userId}
                  wrapperClassName="-mr-2 min-w-min"
                  type="short"
                />
              )}
            </DetailRow>
          )}

          {deposit && defaultAsset && (
            <DetailRow label={t('operation.details.deposit')} className={valueClass}>
              <AssetBalance
                value={deposit}
                asset={defaultAsset}
                showIcon={false}
                className="text-footnote text-text-secondary py-[3px]"
              />
            </DetailRow>
          )}

          {deposit && defaultAsset && depositorSignatory && <hr className="border-divider" />}

          {indexCreated && blockCreated && (
            <DetailRow label={t('operation.details.timePoint')} className={valueClass}>
              {extrinsicLink ? (
                <a
                  className={cn('flex gap-x-1 items-center group', InteractionStyle)}
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
    </dl>
  );
};
