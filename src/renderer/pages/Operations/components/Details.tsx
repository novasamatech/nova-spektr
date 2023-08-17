import cn from 'classnames';

import { useI18n } from '@renderer/app/providers';
import { MultisigAccount, AddressWithExplorers } from '@renderer/entities/account';
import { Icon, Button, FootnoteText, DetailRow } from '@renderer/shared/ui';
import { copyToClipboard, truncate, cnTw } from '@renderer/shared/lib/utils';
import { useToggle } from '@renderer/shared/lib/hooks';
import { ExtendedChain } from '@renderer/entities/network';
import { MultisigTransaction, Transaction, TransactionType } from '@renderer/entities/transaction';
import ValidatorsModal from '@renderer/pages/Staking/Operations/components/Modals/ValidatorsModal/ValidatorsModal';
import { AddressStyle, DescriptionBlockStyle, InteractionStyle } from '../common/constants';
import { getMultisigExtrinsicLink } from '../common/utils';
import { AssetBalance } from '@renderer/entities/asset';

type Props = {
  tx: MultisigTransaction;
  account?: MultisigAccount;
  connection?: ExtendedChain;
  isCardDetails?: boolean;
};

const Details = ({ tx, account, connection, isCardDetails = true }: Props) => {
  const { t } = useI18n();

  const [isAdvancedShown, toggleAdvanced] = useToggle();
  const [isValidatorsOpen, toggleValidators] = useToggle();

  const { indexCreated, blockCreated, deposit, depositor, callHash, callData, description, cancelDescription } = tx;

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
  const depositorSignatory = account?.signatories.find((s) => s.accountId === depositor);
  const extrinsicLink = getMultisigExtrinsicLink(callHash, indexCreated, blockCreated, explorers);

  const valueClass = isCardDetails ? 'text-text-secondary' : 'text-text-primary';

  return (
    <dl className="flex flex-col gap-y-1 w-full">
      {isCardDetails && description && (
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

      {!isCardDetails && account && (
        <DetailRow label={t('operation.details.multisigWallet')} className={valueClass}>
          <AddressWithExplorers
            explorers={explorers}
            addressFont={AddressStyle}
            accountId={account.accountId}
            addressPrefix={addressPrefix}
            wrapperClassName="-mr-2 min-w-min"
            name={account.name}
            type="short"
          />
        </DetailRow>
      )}

      {transaction?.args.dest && (
        <DetailRow label={t('operation.details.recipient')} className={valueClass}>
          <AddressWithExplorers
            type="short"
            explorers={explorers}
            addressFont={AddressStyle}
            address={transaction.args.dest}
            addressPrefix={addressPrefix}
            wrapperClassName="-mr-2 min-w-min"
          />
        </DetailRow>
      )}

      {validators && defaultAsset && (
        <>
          <DetailRow label={t('operation.details.validators')} className={valueClass}>
            <button
              type="button"
              className={cn('flex gap-x-1 items-center', InteractionStyle)}
              onClick={toggleValidators}
            >
              <FootnoteText as="span">{validators.length}</FootnoteText>
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

      {isCardDetails && (
        <Button
          variant="text"
          pallet="primary"
          size="sm"
          suffixElement={<Icon name={isAdvancedShown ? 'chevron-up' : 'chevron-down'} size={16} />}
          className="text-action-text-default hover:text-action-text-default w-fit -ml-2"
          onClick={toggleAdvanced}
        >
          {t('operation.advanced')}
        </Button>
      )}

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
                  <Icon name="new-tab" size={20} className="group-hover:text-icon-hover" />
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
export default Details;
