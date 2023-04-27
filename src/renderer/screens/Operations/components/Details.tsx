import cn from 'classnames';
import { PropsWithChildren } from 'react';

import { useI18n } from '@renderer/context/I18nContext';
import { MultisigAccount } from '@renderer/domain/account';
import { ChainAddress, Balance, Button, Icon } from '@renderer/components/ui';
import Truncate from '@renderer/components/ui/Truncate/Truncate';
import { copyToClipboard } from '@renderer/shared/utils/strings';
import { useToggle } from '@renderer/shared/hooks';
import { ExtendedChain } from '@renderer/services/network/common/types';
import { Explorers } from '@renderer/components/common';
import { getMultisigExtrinsicLink } from '../common/utils';
import ValidatorsModal from '@renderer/screens/Staking/Operations/components/ValidatorsModal/ValidatorsModal';
import { MultisigTransaction } from '@renderer/domain/transaction';
import { FootnoteText } from '@renderer/components/ui-redesign';

type Props = {
  tx: MultisigTransaction;
  account?: MultisigAccount;
  connection?: ExtendedChain;
  withAdvanced?: boolean;
};

const RowStyle = 'flex justify-between items-center py-[3px] px-2';
const LabelStyle = 'text-text-tertiary';
const ValueStyle = 'text-text-secondary';

type DetailsRowProps = {
  label: string;
};
const DetailsRow = ({ label, children }: PropsWithChildren<DetailsRowProps>) => (
  <div className={RowStyle}>
    <FootnoteText as="dt" className={LabelStyle}>
      {label}
    </FootnoteText>
    {typeof children === 'string' ? (
      <FootnoteText as="dd" className={ValueStyle}>
        {children}
      </FootnoteText>
    ) : (
      <dd className={cn('flex items-center gap-1', ValueStyle)}>{children}</dd>
    )}
  </div>
);

const Details = ({ tx, account, connection, withAdvanced = true }: Props) => {
  const { t } = useI18n();

  const [isAdvancedShown, toggleAdvanced] = useToggle();
  const [isValidatorsOpen, toggleValidators] = useToggle();

  const { indexCreated, blockCreated, deposit, depositor, callHash, callData, transaction, description } = tx;

  const defaultAsset = connection?.assets[0];
  const addressPrefix = connection?.addressPrefix;
  const explorers = connection?.explorers;
  const depositorSignatory = account?.signatories.find((s) => s.accountId === depositor);
  const extrinsicLink = getMultisigExtrinsicLink(callHash, indexCreated, blockCreated, explorers);

  return (
    <>
      <dl className="flex flex-col gap-y-1">
        {description && (
          <div className="rounded bg-block-background pl-3 py-2 flex flex-col gap-x-0.5 mb-2">
            <FootnoteText as="dt" className={LabelStyle}>
              {t('operation.details.multisigWallet')}
            </FootnoteText>
            <FootnoteText as="dd" className={ValueStyle}>
              {description}
            </FootnoteText>
          </div>
        )}

        {account && (
          <DetailsRow label={t('operation.details.multisigWallet')}>
            <ChainAddress accountId={account.accountId} addressPrefix={addressPrefix} name={account.name} canCopy />
            <Explorers address={account.accountId} addressPrefix={addressPrefix} explorers={explorers} />
          </DetailsRow>
        )}

        {transaction?.args.dest && (
          <DetailsRow label={t('operation.details.recipient')}>
            <ChainAddress type="short" address={transaction.args.dest} />
            <Explorers address={transaction.args.dest} addressPrefix={addressPrefix} explorers={explorers} />
          </DetailsRow>
        )}

        {transaction?.args.payee && (
          <DetailsRow label={t('operation.details.payee')}>
            {transaction.args.payee.account ? (
              <>
                <ChainAddress type="short" address={transaction.args.payee.account} />
                <Explorers
                  address={transaction.args.payee.account}
                  addressPrefix={addressPrefix}
                  explorers={connection?.explorers}
                />
              </>
            ) : (
              transaction.args.payee
            )}
          </DetailsRow>
        )}

        {transaction?.args.controller && (
          <DetailsRow label={t('operation.details.controller')}>
            <ChainAddress type="short" address={transaction.args.controller} />
            <Explorers address={transaction.args.controller} explorers={connection?.explorers} />
          </DetailsRow>
        )}

        {transaction?.args.targets && defaultAsset && (
          <>
            <DetailsRow label={t('operation.details.validators')}>
              <button
                type="button"
                className={cn(
                  'flex gap-x-1 items-center justify-between h-10 px-[15px] rounded-2lg bg-shade-2',
                  'transition hover:bg-shade-5 focus:bg-shade-5',
                )}
                onClick={toggleValidators}
              >
                <p className="text-sm text-neutral-variant">{t('staking.confirmation.selectValidators')}</p>
                <div className="flex items-center gap-x-1">
                  <p className="py-0.5 px-1 rounded-md bg-shade-30 text-white text-xs">
                    {transaction.args.targets.length}
                  </p>
                  <Icon name="right" size={20} />
                </div>
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
                <Truncate className="max-w-[120px]" text={callHash} />
                <Button variant="text" pallet="shade" onClick={() => copyToClipboard(callHash)}>
                  <Icon name="copy" />
                </Button>
              </DetailsRow>
            )}

            {callData && (
              <DetailsRow label={t('operation.details.callData')}>
                <Truncate className="max-w-[120px]" text={callData} />
                <Button variant="text" pallet="shade" onClick={() => copyToClipboard(callData)}>
                  <Icon name="copy" />
                </Button>
              </DetailsRow>
            )}

            {depositorSignatory && (
              <DetailsRow label={t('operation.details.depositor')}>
                <ChainAddress address={depositorSignatory.address} name={depositorSignatory.name} canCopy />
                <Explorers address={depositorSignatory.accountId} addressPrefix={addressPrefix} explorers={explorers} />
              </DetailsRow>
            )}

            {deposit && defaultAsset && (
              <DetailsRow label={t('operation.details.deposit')}>
                <Balance value={deposit} precision={defaultAsset.precision} symbol={defaultAsset?.symbol} />
              </DetailsRow>
            )}

            {indexCreated && blockCreated && (
              <DetailsRow label={t('operation.details.timePoint')}>
                {blockCreated}-{indexCreated}
                {extrinsicLink && (
                  <a href={extrinsicLink} target="_blank" rel="noopener noreferrer">
                    <Icon className="text-shade-40" name="globe" />
                  </a>
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
          prefixElement={<Icon name={isAdvancedShown ? 'up' : 'down'} />}
          onClick={toggleAdvanced}
        >
          {t('operation.advanced')}
        </Button>
      )}
    </>
  );
};

export default Details;
