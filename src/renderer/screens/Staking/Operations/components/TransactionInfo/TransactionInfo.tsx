import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import cn from 'classnames';
import { PropsWithChildren } from 'react';

import { AddressOnPlate, Fee } from '@renderer/components/common';
import { Balance, Block, Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Explorer } from '@renderer/domain/chain';
import { AccountID } from '@renderer/domain/shared-kernel';
import { RewardsDestination } from '@renderer/domain/stake';
import { Transaction } from '@renderer/domain/transaction';
import { Validator } from '@renderer/domain/validator';
import { AccountDS } from '@renderer/services/storage';
import { useToggle } from '@renderer/shared/hooks';
import AccountsModal from '../AccountsModal/AccountsModal';
import ValidatorsModal from '../ValidatorsModal/ValidatorsModal';

type Props = {
  api: ApiPromise;
  title?: string;
  validators?: Validator[];
  accounts: AccountDS[];
  stake?: string;
  destination?: {
    address?: AccountID;
    type: RewardsDestination;
  };
  asset: Asset;
  explorers?: Explorer[];
  addressPrefix: number;
  transactions: Transaction[];
};

const TransactionInfo = ({
  api,
  title,
  validators,
  accounts,
  stake = '0',
  destination,
  asset,
  explorers,
  addressPrefix,
  transactions,
  children,
}: PropsWithChildren<Props>) => {
  const { t } = useI18n();
  const [isAccountsOpen, toggleAccounts] = useToggle();
  const [isValidatorsOpen, toggleValidators] = useToggle();

  const singleAccount = accounts.length === 1;
  const validatorsExist = validators && validators.length > 0;

  return (
    <>
      <div className="overflow-y-auto">
        <section className="w-[500px] p-5 mx-auto bg-shade-2 rounded-2lg">
          <Block className="flex flex-col gap-y-5">
            {title && <h2 className="text-center text-neutral font-semibold text-xl">{title}</h2>}

            {!title && singleAccount && (
              <div className="flex flex-col items-center mt-6 mb-9 ">
                <Balance
                  className="text-4.5xl font-bold"
                  value={stake}
                  precision={asset.precision}
                  symbol={asset.symbol}
                />
              </div>
            )}

            {!title && !singleAccount && (
              <div className="flex flex-col items-center gap-y-6 mb-9">
                <h2 className="text-neutral font-semibold text-xl">{t('staking.confirmation.totalAmount')}</h2>
                <Balance
                  className="text-4.5xl font-bold"
                  value={new BN(stake).muln(accounts.length).toString()}
                  precision={asset.precision}
                  symbol={asset.symbol}
                />
              </div>
            )}

            {singleAccount ? (
              <AddressOnPlate
                title={t('staking.confirmation.account')}
                address={accounts[0].accountId || ''}
                signType={accounts[0].signingType}
                name={accounts[0].name}
                subName={'dcsadasd asdasd'}
                addressPrefix={addressPrefix}
                explorers={explorers}
              />
            ) : (
              <button
                type="button"
                className={cn(
                  'flex items-center justify-between h-10 px-[15px] rounded-2lg bg-shade-2',
                  'transition hover:bg-shade-5 focus:bg-shade-5',
                )}
                onClick={toggleAccounts}
              >
                <p className="text-sm text-neutral-variant">{t('staking.confirmation.accounts')}</p>
                <div className="flex items-center gap-x-2.5">
                  <p className="py-0.5 px-1.5 rounded-md bg-shade-30 text-white text-xs">{accounts.length}</p>
                  <Icon name="right" size={20} />
                </div>
              </button>
            )}

            <div className="flex flex-col px-[15px] rounded-2lg bg-shade-2">
              <div className="flex items-center justify-between h-10">
                {singleAccount ? (
                  <p className="text-sm text-neutral-variant">{t('staking.confirmation.networkFee')}</p>
                ) : (
                  <p className="text-sm text-neutral-variant">{t('staking.confirmation.networkFeePerAccount')}</p>
                )}
                <Fee
                  className="text-base font-semibold text-neutral"
                  api={api}
                  asset={asset}
                  transaction={transactions[0]}
                />
              </div>
              {!singleAccount && (
                <div className="flex items-center justify-between h-10 border-t border-shade-10">
                  <p className="text-sm text-neutral-variant">{t('staking.confirmation.totalNetworkFee')}</p>
                  <Fee
                    className="text-base font-semibold text-neutral"
                    api={api}
                    repeat={accounts.length}
                    asset={asset}
                    transaction={transactions[0]}
                  />
                </div>
              )}
            </div>

            {validatorsExist && (
              <button
                type="button"
                className={cn(
                  'flex items-center justify-between h-10 px-[15px] rounded-2lg bg-shade-2',
                  'transition hover:bg-shade-5 focus:bg-shade-5',
                )}
                onClick={toggleValidators}
              >
                <p className="text-sm text-neutral-variant">{t('staking.confirmation.selectValidators')}</p>
                <div className="flex items-center gap-x-2.5">
                  <p className="py-0.5 px-1.5 rounded-md bg-shade-30 text-white text-xs">{validators.length}</p>
                  <Icon name="right" size={20} />
                </div>
              </button>
            )}

            {destination?.type === RewardsDestination.TRANSFERABLE && destination.address && (
              <AddressOnPlate
                title={t('staking.confirmation.rewardsDestination')}
                suffix={t('staking.confirmation.transferableRewards')}
                address={destination.address}
                addressPrefix={addressPrefix}
                explorers={explorers}
              />
            )}
            {destination?.type === RewardsDestination.RESTAKE && (
              <div className="flex items-center justify-between h-10 px-[15px] rounded-2lg bg-shade-2">
                <p className="text-sm text-neutral-variant">{t('staking.confirmation.rewardsDestination')}</p>
                <div className="flex items-center gap-x-2.5">
                  <p className="text-base font-semibold text-neutral">{t('staking.confirmation.restakeRewards')}</p>
                </div>
              </div>
            )}
          </Block>

          {children}
        </section>
      </div>

      <AccountsModal
        isOpen={isAccountsOpen}
        accounts={accounts}
        amount={stake}
        asset={asset}
        explorers={explorers}
        addressPrefix={addressPrefix}
        onClose={toggleAccounts}
      />
      {validatorsExist && (
        <ValidatorsModal
          isOpen={isValidatorsOpen}
          validators={validators}
          asset={asset}
          explorers={explorers}
          addressPrefix={addressPrefix}
          onClose={toggleValidators}
        />
      )}
    </>
  );
};

export default TransactionInfo;
