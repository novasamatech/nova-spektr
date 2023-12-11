import cn from 'classnames';
import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { AddressWithExplorers, WalletCardSm, walletModel } from '@entities/wallet';
import { Icon, Button, FootnoteText, DetailRow } from '@shared/ui';
import { copyToClipboard, truncate, cnTw, getAssetById } from '@shared/lib/utils';
import { useToggle } from '@shared/lib/hooks';
import { chainsService, ExtendedChain, isLightClient } from '@entities/network';
import { MultisigTransaction, Transaction, isXcmTransaction } from '@entities/transaction';
import { AddressStyle, DescriptionBlockStyle, InteractionStyle } from '../common/constants';
import { getMultisigExtrinsicLink } from '../common/utils';
import { AssetBalance } from '@entities/asset';
import { ChainTitle } from '@entities/chain';
import type { Address, MultisigAccount, Validator } from '@shared/core';
import { getTransactionFromMultisigTx } from '@entities/multisig';
import { useValidatorsMap, ValidatorsModal } from '@entities/staking';
import { singnatoryUtils } from '@entities/signatory';

type Props = {
  tx: MultisigTransaction;
  account?: MultisigAccount;
  extendedChain?: ExtendedChain;
};

export const OperationCardDetails = ({ tx, account, extendedChain }: Props) => {
  const { t } = useI18n();
  const activeWallet = useUnit(walletModel.$activeWallet);
  const wallets = useUnit(walletModel.$wallets);
  const accounts = useUnit(walletModel.$accounts);

  const api = extendedChain?.api;
  const defaultAsset = extendedChain?.assets[0];
  const addressPrefix = extendedChain?.addressPrefix;
  const explorers = extendedChain?.explorers;
  const connection = extendedChain?.connection;

  const [isAdvancedShown, toggleAdvanced] = useToggle();
  const [isValidatorsOpen, toggleValidators] = useToggle();

  const { indexCreated, blockCreated, deposit, depositor, callHash, callData, description, cancelDescription } = tx;

  const transaction = getTransactionFromMultisigTx(tx);
  const validatorsMap = useValidatorsMap(api, connection && isLightClient(connection));

  const allValidators = Object.values(validatorsMap);

  const startStakingValidators: Address[] =
    (tx.transaction?.type === 'batchAll' &&
      tx.transaction.args.transactions.find((tx: Transaction) => tx.type === 'nominate')?.args?.targets) ||
    [];

  const selectedValidators: Validator[] =
    allValidators.filter((v) => (transaction?.args.targets || startStakingValidators).includes(v.address)) || [];
  const selectedValidatorsAddress = selectedValidators.map((validator) => validator.address);
  const notSelectedValidators = allValidators.filter((v) => !selectedValidatorsAddress.includes(v.address));

  const depositorSignatory = account?.signatories.find((s) => s.accountId === depositor);
  const extrinsicLink = getMultisigExtrinsicLink(callHash, indexCreated, blockCreated, explorers);
  const validatorsAsset =
    tx.transaction && getAssetById(tx.transaction.args.asset, chainsService.getChainById(tx.chainId)?.assets);

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
          <WalletCardSm
            wallet={activeWallet}
            accountId={account.accountId}
            addressPrefix={addressPrefix}
            explorers={explorers}
            className="-mr-2 max-w-none"
          />
        </DetailRow>
      )}

      {isXcmTransaction(tx.transaction) && (
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

          {transaction?.args.destinationChain && (
            <DetailRow label={t('operation.details.toNetwork')} className={valueClass}>
              <ChainTitle chainId={transaction?.args.destinationChain} fontClass={valueClass} />
            </DetailRow>
          )}
        </>
      )}

      {transaction?.args.dest && (
        <DetailRow label={t('operation.details.recipient')} className={valueClass}>
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

      {transaction?.args.payee && (
        <DetailRow label={t('operation.details.payee')} className={valueClass}>
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
                <WalletCardSm
                  wallet={depositorWallet}
                  accountId={depositorSignatory.accountId}
                  addressPrefix={addressPrefix}
                  explorers={explorers}
                />
              ) : (
                <AddressWithExplorers
                  explorers={explorers}
                  accountId={depositorSignatory.accountId}
                  name={depositorSignatory.name}
                  addressFont={AddressStyle}
                  addressPrefix={addressPrefix}
                  showMatrix
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
