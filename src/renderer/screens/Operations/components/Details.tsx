import cn from 'classnames';
import { useCallback } from 'react';

import { useI18n } from '@renderer/context/I18nContext';
import { MultisigAccount } from '@renderer/domain/account';
import { Icon } from '@renderer/components/ui';
import Truncate from '@renderer/components/ui/Truncate/Truncate';
import { copyToClipboard } from '@renderer/shared/utils/strings';
import { useToggle } from '@renderer/shared/hooks';
import { ExtendedChain } from '@renderer/services/network/common/types';
import { getMultisigExtrinsicLink } from '../common/utils';
import { MultisigTransaction, Transaction, TransactionType } from '@renderer/domain/transaction';
import { Button, FootnoteText } from '@renderer/components/ui-redesign';
import ValidatorsModal from '@renderer/screens/Staking/Operations/components/Modals/ValidatorsModal/ValidatorsModal';
import { BalanceNew } from '@renderer/components/common';
import AddressWithExplorers from '@renderer/components/common/AddressWithExplorers/AddressWithExplorers';
import DetailWithLabel, { DetailWithLabelProps } from '@renderer/components/common/DetailsWithLabel/DetailWithLabel';
import { AddressStyle, DescriptionBlockStyle, InteractableStyle, LabelStyle } from '../common/constants';
import cnTw from '@renderer/shared/utils/twMerge';

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
  const DetailsRow = useCallback(
    (props: DetailWithLabelProps) => <DetailWithLabel {...props} className={valueClass} />,
    [valueClass],
  );

  return (
    <>
      <dl className="flex flex-col gap-y-1 w-full">
        {isCardDetails && description && (
          <div className={DescriptionBlockStyle}>
            <FootnoteText as="dt" className={LabelStyle}>
              {t('operation.details.description')}
            </FootnoteText>
            <FootnoteText as="dd" className={cnTw('break-words', valueClass)}>
              {description}
            </FootnoteText>
          </div>
        )}
        {cancelDescription && (
          <div className={DescriptionBlockStyle}>
            <FootnoteText as="dt" className={LabelStyle}>
              {t('operation.details.rejectReason')}
            </FootnoteText>
            <FootnoteText as="dd" className={cnTw('break-words', valueClass)}>
              {cancelDescription}
            </FootnoteText>
          </div>
        )}

        {!isCardDetails && account && (
          <DetailsRow label={t('operation.details.multisigWallet')}>
            <AddressWithExplorers
              explorers={explorers}
              addressFont={AddressStyle}
              accountId={account.accountId}
              addressPrefix={addressPrefix}
              wrapperClassName="-mr-2 min-w-min"
              name={account.name}
              type="short"
            />
          </DetailsRow>
        )}

        {transaction?.args.dest && (
          <DetailsRow label={t('operation.details.recipient')}>
            <AddressWithExplorers
              type="short"
              explorers={explorers}
              addressFont={AddressStyle}
              address={transaction.args.dest}
              addressPrefix={addressPrefix}
              wrapperClassName="-mr-2 min-w-min"
            />
          </DetailsRow>
        )}

        {validators && defaultAsset && (
          <>
            <DetailsRow label={t('operation.details.validators')}>
              <button
                type="button"
                className={cn('flex gap-x-1 items-center', InteractableStyle)}
                onClick={toggleValidators}
              >
                <FootnoteText as="span">{validators.length}</FootnoteText>
                <Icon name="info" size={16} className="text-icon-default" />
              </button>
            </DetailsRow>
            <ValidatorsModal
              isOpen={isValidatorsOpen}
              validators={validators.map((address: string) => ({ address }))}
              explorers={connection?.explorers}
              onClose={toggleValidators}
            />
          </>
        )}

        {transaction?.args.payee && (
          <DetailsRow label={t('operation.details.payee')}>
            {transaction.args.payee.account ? (
              <AddressWithExplorers
                explorers={explorers}
                addressFont={AddressStyle}
                type="short"
                address={transaction.args.payee.account}
                addressPrefix={addressPrefix}
                wrapperClassName="-mr-2 min-w-min"
              />
            ) : (
              transaction.args.payee
            )}
          </DetailsRow>
        )}

        {isCardDetails && (
          <Button
            variant="text"
            pallet="primary"
            size="sm"
            suffixElement={<Icon name={isAdvancedShown ? 'up' : 'down'} size={16} className="text-icon-default" />}
            className="text-action-text-default hover:text-action-text-default w-fit -ml-2"
            onClick={toggleAdvanced}
          >
            {t('operation.advanced')}
          </Button>
        )}

        {isAdvancedShown && (
          <>
            {callHash && (
              <DetailsRow label={t('operation.details.callHash')}>
                <button
                  type="button"
                  className={cn('flex gap-x-1 items-center', InteractableStyle)}
                  onClick={() => copyToClipboard(callHash)}
                >
                  <Truncate className="max-w-[120px] text-footnote" text={callHash} />
                  <Icon name="copy" size={16} className="text-icon-default" />
                </button>
              </DetailsRow>
            )}

            {callData && (
              <DetailsRow label={t('operation.details.callData')}>
                <button
                  type="button"
                  className={cn('flex gap-x-1 items-center', InteractableStyle)}
                  onClick={() => copyToClipboard(callData)}
                >
                  <Truncate className="max-w-[120px] text-footnote" text={callData} />
                  <Icon name="copy" size={16} className="text-icon-default" />
                </button>
              </DetailsRow>
            )}

            {deposit && defaultAsset && depositorSignatory && <hr className="border-divider" />}

            {depositorSignatory && (
              <DetailsRow label={t('operation.details.depositor')}>
                <AddressWithExplorers
                  explorers={explorers}
                  address={depositorSignatory.address}
                  name={depositorSignatory.name}
                  addressFont={AddressStyle}
                  wrapperClassName="-mr-2 min-w-min"
                  type="short"
                />
              </DetailsRow>
            )}

            {deposit && defaultAsset && (
              <DetailsRow label={t('operation.details.deposit')}>
                <BalanceNew
                  value={deposit}
                  asset={defaultAsset}
                  showIcon={false}
                  className="text-footnote text-text-secondary py-[3px]"
                />
              </DetailsRow>
            )}

            {deposit && defaultAsset && depositorSignatory && <hr className="border-divider" />}

            {indexCreated && blockCreated && (
              <DetailsRow label={t('operation.details.timePoint')}>
                {extrinsicLink ? (
                  <a
                    className={cn('flex gap-x-1 items-center', InteractableStyle)}
                    href={extrinsicLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FootnoteText className="text-text-secondary">
                      {blockCreated}-{indexCreated}
                    </FootnoteText>
                    <Icon name="globe" size={16} className="text-icon-default" />
                  </a>
                ) : (
                  `${blockCreated}-${indexCreated}`
                )}
              </DetailsRow>
            )}
          </>
        )}
      </dl>
    </>
  );
};

export default Details;
