import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import cn from 'classnames';
import { useEffect, useState } from 'react';

import { AddressOnPlate, Fee } from '@renderer/components/common';
import { Balance, Block, Button, HintList, Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Explorer } from '@renderer/domain/chain';
import { AccountID, ChainId } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { Validator } from '@renderer/domain/validator';
import { AccountDS } from '@renderer/services/storage';
import { useToggle } from '@renderer/shared/hooks';
import AccountsModal from './components/AccountsModal/AccountsModal';
import ValidatorsModal from './components/ValidatorsModal/ValidatorsModal';

type Props = {
  api?: ApiPromise;
  chainId: ChainId;
  validators: Validator[];
  accounts: AccountDS[];
  stake: string;
  destination: AccountID;
  asset: Asset;
  explorers?: Explorer[];
  addressPrefix: number;
  onResult: (transactions: Transaction[]) => void;
};

const ConfirmBond = ({
  api,
  chainId,
  validators,
  accounts,
  stake,
  destination,
  asset,
  explorers,
  addressPrefix,
  onResult,
}: Props) => {
  const { t } = useI18n();
  const [isAccountsOpen, toggleAccounts] = useToggle();
  const [isValidatorsOpen, toggleValidators] = useToggle();

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const newTransactions = accounts.map(({ accountId = '' }) => {
      const commonPayload = { chainId, address: accountId };

      const bondTx = {
        ...commonPayload,
        type: TransactionType.BOND,
        args: {
          value: stake,
          controller: accountId,
          payee: destination ? { Account: destination } : 'Staked',
        },
      };

      const nominateTx = {
        ...commonPayload,
        type: TransactionType.NOMINATE,
        args: {
          targets: validators.map((validator) => validator.address),
        },
      };

      return {
        ...commonPayload,
        type: TransactionType.BATCH_ALL,
        args: { transactions: [bondTx, nominateTx] },
      };
    });

    setTransactions(newTransactions);
  }, []);

  if (!api) {
    return null;
  }

  const totalStake = new BN(stake).muln(accounts.length);
  const singleAccount = accounts.length === 1;

  return (
    <>
      <div className="overflow-y-auto">
        <section className="w-[500px] p-5 mx-auto bg-shade-2 rounded-2lg">
          <Block className="flex flex-col gap-y-5">
            <div className="flex flex-col items-center">
              {singleAccount ? (
                <Balance
                  className="mt-6 mb-9 text-4.5xl font-bold"
                  value={stake}
                  precision={asset.precision}
                  symbol={asset.symbol}
                />
              ) : (
                <>
                  <h2 className="text-neutral font-semibold text-xl">{t('staking.confirmation.totalAmount')}</h2>
                  <Balance
                    className="mt-6 mb-9 text-4.5xl font-bold"
                    value={totalStake.toString()}
                    precision={asset.precision}
                    symbol={asset.symbol}
                  />
                </>
              )}
            </div>

            {singleAccount ? (
              <AddressOnPlate
                title={t('staking.confirmation.account')}
                address={accounts[0].accountId || ''}
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

            {destination ? (
              <AddressOnPlate
                title={t('staking.confirmation.rewardsDestination')}
                suffix={t('staking.confirmation.transferableRewards')}
                address={destination}
                addressPrefix={addressPrefix}
                explorers={explorers}
              />
            ) : (
              <div className="flex items-center justify-between h-10 px-[15px] rounded-2lg bg-shade-2">
                <p className="text-sm text-neutral-variant">{t('staking.confirmation.rewardsDestination')}</p>
                <div className="flex items-center gap-x-2.5">
                  <p className="text-base font-semibold text-neutral">{t('staking.confirmation.restakeRewards')}</p>
                </div>
              </div>
            )}
          </Block>

          <HintList className="mt-2.5 mb-5 px-[15px]">
            <HintList.Item>{t('staking.confirmation.hintOne')}</HintList.Item>
            <HintList.Item>{t('staking.confirmation.hintTwo')}</HintList.Item>
            <HintList.Item>{t('staking.confirmation.hintThree')}</HintList.Item>
            <HintList.Item>{t('staking.confirmation.hintFour')}</HintList.Item>
          </HintList>

          <div className="flex flex-col items-center gap-y-2.5">
            <Button
              variant="fill"
              pallet="primary"
              weight="lg"
              suffixElement={<Icon name="qrLine" size={20} />}
              onClick={() => onResult(transactions)}
            >
              {t('staking.confirmation.signButton')}
            </Button>

            {/* TODO: implement in future */}
            {/*<Button*/}
            {/*  variant="outline"*/}
            {/*  pallet="primary"*/}
            {/*  weight="lg"*/}
            {/*  suffixElement={<Icon name="addLine" size={20} />}*/}
            {/*  onClick={addToQueue}*/}
            {/*>*/}
            {/*  {t('staking.confirmation.queueButton')}*/}
            {/*</Button>*/}
          </div>
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
      <ValidatorsModal
        isOpen={isValidatorsOpen}
        validators={validators}
        asset={asset}
        explorers={explorers}
        addressPrefix={addressPrefix}
        onClose={toggleValidators}
      />
    </>
  );
};

export default ConfirmBond;
