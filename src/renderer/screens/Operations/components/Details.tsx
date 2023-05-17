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
import { MultisigTransaction } from '@renderer/domain/transaction';
import { Button, FootnoteText } from '@renderer/components/ui-redesign';
import ValidatorsModal from '@renderer/screens/Staking/Operations/components/ValidatorsModal/ValidatorsModal';
import { BalanceNew } from '@renderer/components/common';
import AddressWithExplorers from '@renderer/components/common/AddressWithExplorers/AddressWithExplorers';
import DetailWithLabel, { DetailWithLabelProps } from '@renderer/screens/Operations/components/DetailWithLabel';
import { AddressStyle, DescriptionBlockStyle, InteractableStyle, LabelStyle } from '../common/constants';

type Props = {
  tx: MultisigTransaction;
  account?: MultisigAccount;
  connection?: ExtendedChain;
  withAdvanced?: boolean;
};

const Details = ({ tx, account, connection, withAdvanced = true }: Props) => {
  const { t } = useI18n();

  const [isAdvancedShown, toggleAdvanced] = useToggle();
  const [isValidatorsOpen, toggleValidators] = useToggle();

  const {
    indexCreated,
    blockCreated,
    deposit,
    depositor,
    callHash,
    callData,
    transaction,
    description,
    cancelDescription,
  } = tx;

  const defaultAsset = connection?.assets[0];
  const addressPrefix = connection?.addressPrefix;
  const explorers = connection?.explorers;
  const depositorSignatory = account?.signatories.find((s) => s.accountId === depositor);
  const extrinsicLink = getMultisigExtrinsicLink(callHash, indexCreated, blockCreated, explorers);

  const valueClass = withAdvanced ? 'text-text-secondary' : 'text-text-primary';
  const DetailsRow = useCallback(
    (props: DetailWithLabelProps) => <DetailWithLabel {...props} className={valueClass} />,
    [valueClass],
  );

  return (
    <>
      <dl className="flex flex-col gap-y-1 w-full">
        {description && (
          <div className={DescriptionBlockStyle}>
            <FootnoteText as="dt" className={LabelStyle}>
              {t('operation.details.description')}
            </FootnoteText>
            <FootnoteText as="dd" className={valueClass}>
              {description}
            </FootnoteText>
          </div>
        )}
        {cancelDescription && (
          <div className={DescriptionBlockStyle}>
            <FootnoteText as="dt" className={LabelStyle}>
              {t('operation.details.rejectReason')}
            </FootnoteText>
            <FootnoteText as="dd" className={valueClass}>
              {cancelDescription}
            </FootnoteText>
          </div>
        )}

        {account && (
          <DetailsRow label={t('operation.details.multisigWallet')}>
            <AddressWithExplorers
              explorers={explorers}
              addressFont={AddressStyle}
              accountId={account.accountId}
              addressPrefix={addressPrefix}
              name={account.name}
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
            />
          </DetailsRow>
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
              />
            ) : (
              transaction.args.payee
            )}
          </DetailsRow>
        )}

        {transaction?.args.controller && (
          <DetailsRow label={t('operation.details.controller')}>
            <AddressWithExplorers
              explorers={explorers}
              addressFont={AddressStyle}
              type="short"
              address={transaction.args.controller}
            />
          </DetailsRow>
        )}

        {transaction?.args.targets && defaultAsset && (
          <>
            <DetailsRow label={t('operation.details.validators')}>
              <button
                type="button"
                className={cn('flex gap-x-1 items-center', InteractableStyle)}
                onClick={toggleValidators}
              >
                <FootnoteText as="span">{transaction.args.targets.length}</FootnoteText>
                <Icon name="info" size={16} className="text-icon-default" />
              </button>
            </DetailsRow>
            <ValidatorsModal
              isOpen={isValidatorsOpen}
              validators={transaction?.args.targets.map((address: string) => ({
                address,
              }))}
              asset={defaultAsset}
              explorers={connection?.explorers}
              addressPrefix={connection?.addressPrefix}
              onClose={toggleValidators}
            />
          </>
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
                  <Truncate className="max-w-[120px] font-inter text-footnote" text={callHash} />
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
                  <Truncate className="max-w-[120px] font-inter text-footnote" text={callData} />
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
                />
              </DetailsRow>
            )}

            {deposit && defaultAsset && (
              <DetailsRow label={t('operation.details.deposit')}>
                <BalanceNew
                  value={deposit}
                  asset={defaultAsset}
                  showIcon={false}
                  className="text-footnote text-text-secondary py-[3px] px-2"
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
                    <FootnoteText>
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

      {withAdvanced && (
        <Button
          variant="text"
          pallet="primary"
          size="sm"
          suffixElement={<Icon name={isAdvancedShown ? 'up' : 'down'} size={16} className="text-icon-default" />}
          className="my-1 w-fit"
          onClick={toggleAdvanced}
        >
          {t('operation.advanced')}
        </Button>
      )}
    </>
  );
};

export default Details;
