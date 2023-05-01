import { ApiPromise } from '@polkadot/api';
import { BN_ZERO, BN } from '@polkadot/util';
import cn from 'classnames';
import { PropsWithChildren } from 'react';

import { AddressOnPlate, Fee, Deposit } from '@renderer/components/common';
import { Balance, Block, Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Explorer } from '@renderer/domain/chain';
import { Address, SigningType } from '@renderer/domain/shared-kernel';
import { RewardsDestination } from '@renderer/domain/stake';
import { Transaction } from '@renderer/domain/transaction';
import { Validator } from '@renderer/domain/validator';
import { useToggle } from '@renderer/shared/hooks';
import AccountsModal from '../AccountsModal/AccountsModal';
import ValidatorsModal from '../ValidatorsModal/ValidatorsModal';
import { toAccountId } from '@renderer/shared/utils/address';
import { Account } from '@renderer/domain/account';

type Destination = {
  address?: Address;
  type: RewardsDestination;
};

export interface InfoProps {
  api: ApiPromise;
  title?: string;
  validators?: Validator[];
  accounts: Account[];
  amounts?: string[];
  destination?: Destination;
  asset: Asset;
  explorers?: Explorer[];
  addressPrefix: number;
  transaction: Transaction;
  multisigTx?: Transaction;
}

const TransactionInfo = ({
  api,
  title,
  validators,
  accounts,
  amounts = [],
  destination,
  asset,
  explorers,
  addressPrefix,
  transaction,
  multisigTx,
  children,
}: PropsWithChildren<InfoProps>) => {
  const { t } = useI18n();
  const [isAccountsOpen, toggleAccounts] = useToggle();
  const [isValidatorsOpen, toggleValidators] = useToggle();

  const singleAccount = accounts.length === 1;
  const validatorsExist = validators && validators.length > 0;
  const totalAmount = amounts.reduce((acc, amount) => acc.add(new BN(amount)), BN_ZERO).toString();

  const threshold = multisigTx?.args.threshold;
  console.log(multisigTx);
  console.log(transaction);

  return (
    <>
      <div className="overflow-y-auto flex-1">
        <section className="w-[500px] p-5 mx-auto bg-shade-2 rounded-2lg">
          <Block className="flex flex-col gap-y-5 p-5">
            {title ? (
              <h2 className="text-center text-neutral font-semibold text-xl">{title}</h2>
            ) : (
              <div className="flex flex-col items-center mt-6 mb-9">
                {!singleAccount && (
                  <h2 className="text-neutral font-semibold text-xl">{t('staking.confirmation.totalAmount')}</h2>
                )}
                <Balance
                  className="text-4.5xl font-bold"
                  value={totalAmount}
                  precision={asset.precision}
                  symbol={asset.symbol}
                />
              </div>
            )}

            {singleAccount ? (
              <AddressOnPlate
                title={t('staking.confirmation.account')}
                accountId={accounts[0].accountId}
                signType={accounts[0].signingType}
                name={accounts[0].name}
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

            {multisigTx && (
              <AddressOnPlate
                title={t('staking.confirmation.signer')}
                accountId={toAccountId(multisigTx?.address)}
                signType={SigningType.PARITY_SIGNER}
                addressPrefix={addressPrefix}
                explorers={explorers}
              />
            )}

            <div className="flex flex-col px-[15px] rounded-2lg bg-shade-2">
              <div className="flex items-center justify-between h-10">
                {singleAccount ? (
                  <p className="text-sm text-neutral-variant">{t('staking.confirmation.networkFee')}</p>
                ) : (
                  <p className="text-sm text-neutral-variant">{t('staking.confirmation.networkFeePerAccount')}</p>
                )}
                <Fee className="text-base text-neutral" api={api} asset={asset} transaction={transaction} />
              </div>
              {!singleAccount && (
                <div className="flex items-center justify-between h-10 border-t border-shade-10">
                  <p className="text-sm text-neutral-variant">{t('staking.confirmation.totalNetworkFee')}</p>
                  <Fee
                    className="text-base text-neutral"
                    api={api}
                    multiply={accounts.length}
                    asset={asset}
                    transaction={transaction}
                  />
                </div>
              )}
              {multisigTx && (
                <div className="flex items-center justify-between h-10 border-t border-shade-10">
                  <p className="text-sm text-neutral-variant">{t('transferDetails.networkDeposit')}</p>
                  <Deposit className="text-base text-neutral" api={api} asset={asset} threshold={threshold} />
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
                accountId={toAccountId(destination.address)}
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
        amounts={amounts}
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
