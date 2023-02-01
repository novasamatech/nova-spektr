/* eslint-disable i18next/no-literal-string */
import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { ReactNode, useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import cn from 'classnames';

import { Fee } from '@renderer/components/common';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import {
  AmountInput,
  Balance,
  Button,
  Dropdown,
  Icon,
  Identicon,
  InputHint,
  RadioGroup,
  Select,
} from '@renderer/components/ui';
import { Option as DropdownOption } from '@renderer/components/ui/Dropdowns/common/types';
import { RadioOption, ResultOption } from '@renderer/components/ui/RadioGroup/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { AccountID, ChainId, SigningType } from '@renderer/domain/shared-kernel';
import { useBalance } from '@renderer/services/balance/balanceService';
import { formatAmount, stakeable, transferable } from '@renderer/services/balance/common/utils';
import { AccountDS, BalanceDS } from '@renderer/services/storage';
import { validateAddress } from '@renderer/utils/address';
import { useAccount } from '@renderer/services/account/accountService';

const PAYOUT_URL = 'https://wiki.polkadot.network/docs/learn-simple-payouts';

const enum RewardsDestination {
  RESTAKE,
  TRANSFERABLE,
}

const validateBalanceForFee = (balance: BalanceDS | string, fee: string, amount: string, asset: Asset): boolean => {
  const transferableBalance = typeof balance === 'string' ? balance : transferable(balance);

  const amountWithFee = new BN(formatAmount(amount, asset.precision)).add(new BN(fee)).toString();

  return new BN(fee).lte(new BN(transferableBalance)) && validateBalance(balance, amountWithFee, asset);
};

const validateBalance = (balance: BalanceDS | string, amount: string, asset: Asset): boolean => {
  const stakeableBalance = typeof balance === 'string' ? balance : stakeable(balance);

  return new BN(formatAmount(amount, asset.precision)).lte(new BN(stakeableBalance));
};

const getDropdownPayload = (
  account: AccountDS,
  balance?: BalanceDS,
  asset?: Asset,
  fee?: string,
  amount?: string,
): DropdownOption<AccountID> => {
  const address = account.accountId || '';

  let isAvailable = true;
  const balanceExists = balance && asset && fee && amount;

  if (balanceExists) {
    isAvailable = validateBalanceForFee(balance, fee, amount, asset) && validateBalance(balance, amount, asset);
  }

  const element = (
    <div className="flex justify-between items-center gap-x-2.5">
      <div className="flex items-center">
        <Identicon address={address} size={34} background={false} canCopy={false} />
        <p className="text-left text-neutral text-lg font-semibold">{account.name}</p>
      </div>
      {balanceExists ? (
        <div className="flex items-center gap-x-1">
          {!isAvailable && <Icon size={12} className="text-error" name="warnCutout" />}

          <Balance
            className={cn(!isAvailable && 'text-error')}
            value={stakeable(balance)}
            precision={asset.precision}
            symbol={asset.symbol}
          />
        </div>
      ) : (
        <></>
      )}
    </div>
  );

  return {
    id: address,
    value: address,
    element,
  };
};

type BondForm = {
  amount: string;
  destination: AccountID;
};

type Props = {
  accountIds: string[];
  api?: ApiPromise;
  chainId?: ChainId;
  asset?: Asset;
  onResult: () => void;
};

const InitBond = ({ accountIds, api, chainId, asset, onResult }: Props) => {
  const { t } = useI18n();
  const { getLiveAssetBalances } = useBalance();

  const { getLiveAccounts } = useAccount();
  const { getTransactionFee } = useTransaction();

  const accounts = getLiveAccounts({ signingType: SigningType.PARITY_SIGNER });

  const selectedAccounts = accounts.filter(
    (a) => (!a.chainId || a.chainId === chainId) && accountIds.includes(a.accountId || ''),
  );

  const [fee, setFee] = useState('');

  const [balanceRange, setBalanceRange] = useState<[string, string]>();

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [stakeAccounts, setStakeAccounts] = useState<DropdownOption<AccountID>[]>([]);
  const [activeAccounts, setActiveAccounts] = useState<ResultOption<AccountID>[]>([]);

  const [activeRadio, setActiveRadio] = useState<ResultOption<RewardsDestination>>();

  const [payoutAccounts, setPayoutAccounts] = useState<DropdownOption<AccountID>[]>([]);
  const [activePayoutAccount, setActivePayoutAccount] = useState<ResultOption<AccountID>>();

  const balances = getLiveAssetBalances(
    // @ts-ignore
    selectedAccounts.map((a) => a.publicKey).filter(Boolean),
    chainId || '0x',
    `${asset?.assetId}`,
  );

  const {
    handleSubmit,
    control,
    watch,
    formState: { isValid },
  } = useForm<BondForm>({
    mode: 'onChange',
    defaultValues: { amount: '', destination: '' },
  });

  const amount = watch('amount');

  // set balances
  useEffect(() => {
    if (!api || !chainId || !asset) return;

    const stakeableBalance = balances.map(stakeable);

    const minMaxBalances = stakeableBalance.reduce<[string, string]>(
      (acc, balance) => {
        if (!balance) return acc;

        acc[0] = new BN(balance).lt(new BN(acc[0])) ? balance : acc[0];
        acc[1] = new BN(balance).gt(new BN(acc[1])) ? balance : acc[1];

        return acc;
      },
      [stakeableBalance[0], stakeableBalance[0]],
    );

    setBalanceRange(minMaxBalances);
  }, [api, chainId, asset, activeAccounts.length]);

  // Init stake wallets
  useEffect(() => {
    if (!asset) return;

    (async () => {
      const formattedAccounts = selectedAccounts.map((a) => {
        const matchBalance = balances.find((b) => b.publicKey === a.publicKey) as BalanceDS;

        return getDropdownPayload(a, matchBalance, asset, fee, amount);
      });

      setStakeAccounts(formattedAccounts);
      setActiveAccounts(formattedAccounts);
    })();
  }, [asset, accountIds.length, amount, fee, balances.length]);

  // Init payout wallets
  useEffect(() => {
    if (!chainId) return;

    (async () => {
      const payoutAccounts = accounts
        .filter((account) => !account.chainId || account.chainId === chainId)
        // @ts-ignore
        .map(getDropdownPayload);

      setPayoutAccounts(payoutAccounts);
    })();
  }, [accounts.length]);

  // const checkBalance = (balance: Balance, amount: string, asset: Asset, fee: string) => {
  //   const stakeableBalance = stakeable(balance);
  //   const transferableBalance = transferable(balance);

  //   return new BN(stakeableBalance).lt(new BN(total));
  // };

  useEffect(() => {
    if (!chainId || !asset || !balanceRange) return;

    setTransactions(
      activeAccounts.map((a) => {
        return {
          chainId,
          type: TransactionType.BATCH_ALL,
          address: a.value,
          args: {
            transactions: [
              {
                chainId,
                type: TransactionType.BOND,
                address: a.value,
                args: {
                  value: formatAmount(amount, asset.precision),
                  controller: a.value,
                  payee:
                    activeRadio?.value === RewardsDestination.TRANSFERABLE && activePayoutAccount?.value
                      ? { Account: activePayoutAccount.value }
                      : 'Staked',
                },
              } as Transaction,
              {
                chainId,
                type: TransactionType.NOMINATE,
                address: a.value,
                args: {
                  targets: Array(16).fill(a.value),
                },
              } as Transaction,
            ],
          },
        } as Transaction;
      }),
    );
  }, [balanceRange, amount, asset, activeRadio, activePayoutAccount]);

  useEffect(() => {
    (async () => {
      if (!api || !amount || !validateAddress(transactions?.[0]?.args.dest) || !transactions.length) return;

      setFee(await getTransactionFee(transactions[0], api));
    })();
  }, [amount]);

  if (!asset) {
    return <div>LOADING</div>;
  }

  const initBond: SubmitHandler<BondForm> = ({ amount, destination }) => {
    onResult();
  };

  // const validateBalanceForFee = (amount: string): boolean => {
  //   if (!transferableBalanceRange) return false;
  //   const currentFee = fee || '0';

  //   return new BN(currentFee).lte(new BN(transferableBalanceRange[0]));
  // };

  // const validateBalance = (amount: string, stakeableBalance: string) => {
  //   return new BN(formatAmount(amount, asset.precision)).lte(new BN(stakeableBalance));
  // };

  const getDestinations = (): RadioOption<number>[] => {
    const createElement = (label: string): ReactNode => (
      <div className="grid grid-cols-2 items-center flex-1">
        <p className="text-neutral text-lg leading-5 font-semibold">{label}</p>
      </div>
    );

    return [
      {
        id: '1',
        value: RewardsDestination.RESTAKE,
        element: createElement(t('staking.bond.restakeRewards')),
      },
      {
        id: '2',
        value: RewardsDestination.TRANSFERABLE,
        element: createElement(t('staking.bond.transferableRewards')),
      },
    ];
  };

  return (
    <div className="w-[600px] flex flex-col items-center mx-auto rounded-2lg bg-shade-2 p-5 ">
      <div className="w-full p-5 rounded-2lg bg-white shadow-surface">
        <Select
          placeholder={t('staking.bond.selectStakeAccountLabel')}
          summary={t('staking.bond.selectStakeAccountSummary')}
          activeIds={activeAccounts.map((w) => w.id.toString())}
          options={stakeAccounts}
          onChange={setActiveAccounts}
        />
      </div>

      <form
        id="initBondForm"
        className="flex flex-col gap-y-5 p-5 w-full rounded-2lg bg-white mt-2.5 mb-5 shadow-surface"
        onSubmit={handleSubmit(initBond)}
      >
        <Controller
          name="amount"
          control={control}
          rules={{
            required: true,
            validate: {
              notZero: (v) => Number(v) > 0,
              insufficientBalance: (amount) => validateBalance(balanceRange?.[0] || '0', amount, asset),
              // insufficientBalanceForFee: validateBalanceForFee,
            },
          }}
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <>
              <AmountInput
                placeholder={t('staking.bond.amountPlaceholder')}
                value={value}
                name="amount"
                balance={balanceRange}
                asset={asset}
                invalid={Boolean(error)}
                onChange={onChange}
              />
              <InputHint active={error?.type === 'insufficientBalance'} variant="error">
                {t('transfer.notEnoughBalanceError')}
              </InputHint>
              <InputHint active={error?.type === 'insufficientBalanceForFee'} variant="error">
                {t('transfer.notEnoughBalanceForFeeError')}
              </InputHint>
              <InputHint active={error?.type === 'required'} variant="error">
                {t('transfer.requiredAmountError')}
              </InputHint>
              <InputHint active={error?.type === 'notZero'} variant="error">
                {t('transfer.requiredAmountError')}
              </InputHint>
            </>
          )}
        />

        <div className="grid grid-cols-2">
          <p className="text-neutral text-xs uppercase font-bold">{t('staking.bond.rewardsDestinationTitle')}</p>
          <a
            className="flex items-center gap-x-1 justify-self-end text-primary w-max"
            href={PAYOUT_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="info" size={14} />
            <span className="underline text-xs">{t('staking.bond.aboutRewards')}</span>
          </a>
          <RadioGroup
            activeId={activeRadio?.id}
            options={getDestinations()}
            className="col-span-2"
            optionClass="p-2.5 rounded-2lg bg-shade-2 mt-2.5"
            onChange={setActiveRadio}
          />
        </div>
        {activeRadio?.value === RewardsDestination.TRANSFERABLE && (
          <Controller
            name="destination"
            control={control}
            render={({ field: { onChange } }) => (
              <Dropdown
                variant="up"
                label={t('staking.bond.payoutAccountLabel')}
                placeholder={t('staking.bond.payoutAccountPlaceholder')}
                activeId={activePayoutAccount?.id.toString() || ''}
                options={payoutAccounts}
                onChange={(option) => {
                  setActivePayoutAccount(option);
                  onChange(option.value);
                }}
              />
            )}
          />
        )}
        <div className="flex justify-between items-center uppercase text-neutral-variant text-2xs">
          <p>{t('transfer.networkFee')}</p>
          {fee}
          <Fee className="text-neutral font-semibold" api={api} asset={asset} transaction={transactions[0]} />
        </div>
      </form>

      <Button type="submit" form="initBondForm" variant="fill" pallet="primary" weight="lg" disabled={!isValid}>
        Continue
      </Button>
    </div>
  );
};

export default InitBond;
