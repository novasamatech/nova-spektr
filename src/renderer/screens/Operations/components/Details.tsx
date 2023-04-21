import cn from 'classnames';

import { useI18n } from '@renderer/context/I18nContext';
import { MultisigTransactionDS } from '@renderer/services/storage';
import { MultisigAccount } from '@renderer/domain/account';
import { ChainAddress, Balance, Button, Icon } from '@renderer/components/ui';
import Truncate from '@renderer/components/ui/Truncate/Truncate';
import { copyToClipboard } from '@renderer/shared/utils/strings';
import { useToggle } from '@renderer/shared/hooks';
import { ExtendedChain } from '@renderer/services/network/common/types';
import { Explorers } from '@renderer/components/common';
import { getMultisigExtrinsicLink } from '../common/utils';
import ValidatorsModal from '@renderer/screens/Staking/Operations/components/ValidatorsModal/ValidatorsModal';

type Props = {
  tx: MultisigTransactionDS & { rowIndex: number };
  account?: MultisigAccount;
  connection?: ExtendedChain;
  withAdvanced?: boolean;
};

const Details = ({ tx, account, connection, withAdvanced = true }: Props) => {
  const { t } = useI18n();

  const [isAdvancedShown, toggleAdvanced] = useToggle();
  const [isValidatorsOpen, toggleValidators] = useToggle();

  const { indexCreated, blockCreated, deposit, depositor, callHash, callData, transaction } = tx;

  const defaultAsset = connection?.assets[0];
  const addressPrefix = connection?.addressPrefix;
  const explorers = connection?.explorers;
  const depositorSignatory = account?.signatories.find((s) => s.accountId === depositor);
  const extrinsicLink = getMultisigExtrinsicLink(callHash, indexCreated, blockCreated, explorers);

  return (
    <>
      <ul>
        {account && (
          <li className="flex justify-between items-center">
            <div className="text-shade-40">{t('operation.details.multisigWallet')}</div>
            <div className="flex items-center gap-1">
              <ChainAddress accountId={account.accountId} addressPrefix={addressPrefix} name={account.name} canCopy />
              <Explorers address={account.accountId} addressPrefix={addressPrefix} explorers={explorers} />
            </div>
          </li>
        )}

        {transaction?.args.dest && (
          <li className="flex justify-between items-center">
            <div className="text-shade-40">{t('operation.details.recipient')}</div>
            <div className="flex items-center gap-1">
              <ChainAddress type="short" address={transaction.args.dest} />
              <Explorers address={transaction.args.dest} addressPrefix={addressPrefix} explorers={explorers} />
            </div>
          </li>
        )}

        {transaction?.args.payee && (
          <li className="flex justify-between items-center">
            <div className="text-shade-40">{t('operation.details.payee')}</div>
            <div className="flex items-center gap-1">
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
            </div>
          </li>
        )}

        {transaction?.args.controller && (
          <li className="flex justify-between items-center">
            <div className="text-shade-40">{t('operation.details.controller')}</div>
            <div className="flex items-center gap-1">
              <ChainAddress type="short" address={transaction.args.controller} />
              <Explorers address={transaction.args.controller} explorers={connection?.explorers} />
            </div>
          </li>
        )}

        {transaction?.args.targets && defaultAsset && (
          <li className="flex justify-between items-center">
            <div className="text-shade-40">{t('operation.details.validators')}</div>
            <div className="flex items-center gap-1">
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
            </div>

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
          </li>
        )}

        {isAdvancedShown && (
          <>
            {callHash && (
              <li className="flex justify-between items-center">
                <div className="text-shade-40">{t('operation.details.callHash')}</div>
                <div className="flex items-center">
                  <Truncate className="max-w-[120px]" text={callHash} />
                  <Button variant="text" pallet="shade" onClick={() => copyToClipboard(callHash)}>
                    <Icon name="copy" />
                  </Button>
                </div>
              </li>
            )}

            {callData && (
              <li className="flex justify-between items-center">
                <div className="text-shade-40">{t('operation.details.callData')}</div>
                <div className="flex items-center">
                  <Truncate className="max-w-[120px]" text={callData} />
                  <Button variant="text" pallet="shade" onClick={() => copyToClipboard(callData)}>
                    <Icon name="copy" />
                  </Button>
                </div>
              </li>
            )}

            {depositorSignatory && (
              <li className="flex justify-between items-center">
                <div className="text-shade-40">{t('operation.details.depositor')}</div>
                <div className="flex gap-1">
                  <ChainAddress address={depositorSignatory.address} name={depositorSignatory.name} canCopy />
                  <Explorers
                    address={depositorSignatory.accountId}
                    addressPrefix={addressPrefix}
                    explorers={explorers}
                  />
                </div>
              </li>
            )}

            {deposit && defaultAsset && (
              <li className="flex justify-between items-center">
                <div className="text-shade-40">{t('operation.details.deposit')}</div>
                <Balance value={deposit} precision={defaultAsset.precision} symbol={defaultAsset?.symbol} />
              </li>
            )}

            {indexCreated && blockCreated && (
              <li className="flex justify-between items-center">
                <div className="text-shade-40">{t('operation.details.timePoint')}</div>
                <div className="flex gap-1">
                  {blockCreated}-{indexCreated}
                  {extrinsicLink && (
                    <a href={extrinsicLink} target="_blank" rel="noopener noreferrer">
                      <Icon className="text-shade-40" name="globe" />
                    </a>
                  )}
                </div>
              </li>
            )}
          </>
        )}
      </ul>

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
