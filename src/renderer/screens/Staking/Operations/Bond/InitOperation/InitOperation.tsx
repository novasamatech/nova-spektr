import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import cn from 'classnames';
import { useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { isAddress } from '@polkadot/util-crypto';
import { TFunction } from 'react-i18next';

import { Fee } from '@renderer/components/common';
import {
  ChainAddress,
  AmountInput,
  Balance,
  Button,
  Combobox,
  Icon,
  Identicon,
  InputHint,
  Plate,
  RadioGroup,
  Select,
} from '@renderer/components/ui';
import { DropdownOption, DropdownResult } from '@renderer/components/ui/Dropdowns/common/types';
import { RadioOption, RadioResult } from '@renderer/components/ui/RadioGroup/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Address, ChainId, AccountId, SigningType } from '@renderer/domain/shared-kernel';
import { RewardsDestination } from '@renderer/domain/stake';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { useAccount } from '@renderer/services/account/accountService';
import { useBalance } from '@renderer/services/balance/balanceService';
import { formatAmount, stakeableAmount, transferableAmount } from '@renderer/services/balance/common/utils';
import { useValidators } from '@renderer/services/staking/validatorsService';
import { AccountDS, BalanceDS } from '@renderer/services/storage';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { Wallet } from '@renderer/domain/wallet';
import { useWallet } from '@renderer/services/wallet/walletService';

const PAYOUT_URL = 'https://wiki.polkadot.network/docs/learn-simple-payouts';

const validateBalance = (balance: BalanceDS | string, amount: string, asset: Asset, fee?: string): boolean => {
  const stakeableBalance = typeof balance === 'string' ? balance : stakeableAmount(balance);

  let formatedAmount = new BN(formatAmount(amount, asset.precision));

  if (fee) {
    formatedAmount = formatedAmount.add(new BN(fee));
  }

  return formatedAmount.lte(new BN(stakeableBalance));
};

const validateBalanceForFee = (balance: BalanceDS | string, fee: string, amount: string, asset: Asset): boolean => {
  const transferableBalance = typeof balance === 'string' ? balance : transferableAmount(balance);

  return new BN(fee).lte(new BN(transferableBalance)) && validateBalance(balance, amount, asset, fee);
};

const getDropdownPayload = (
  account: AccountDS,
  wallet?: Wallet,
  balance?: BalanceDS,
  asset?: Asset,
  fee?: string,
  amount?: string,
): DropdownOption<Address> => {
  const address = account.accountId || '';
  const accountId = account.accountId || '';
  const balanceExists = balance && asset;

  const balanceIsIncorrect =
    balanceExists &&
    amount &&
    fee &&
    !(validateBalanceForFee(balance, fee, amount, asset) && validateBalance(balance, amount, asset));

  const element = (
    <div className="flex justify-between items-center gap-x-2.5">
      <div className="flex gap-x-[5px] items-center">
        <ChainAddress
          accountId={address}
          name={account.name}
          subName={wallet?.name}
          signType={account.signingType}
          size={30}
          canCopy={false}
        />
      </div>
      {balanceExists && (
        <div className="flex items-center gap-x-1">
          {balanceIsIncorrect && <Icon size={12} className="text-error" name="warnCutout" />}

          <Balance
            className={cn(balanceIsIncorrect && 'text-error')}
            value={stakeableAmount(balance)}
            precision={asset.precision}
            symbol={asset.symbol}
          />
        </div>
      )}
    </div>
  );

  return {
    id: accountId,
    value: address,
    element,
  };
};

const getDestinations = (t: TFunction): RadioOption<RewardsDestination>[] => {
  const options = [
    { value: RewardsDestination.RESTAKE, element: t('staking.bond.restakeRewards') },
    { value: RewardsDestination.TRANSFERABLE, element: t('staking.bond.transferableRewards') },
  ];

  return options.map((dest, index) => ({
    id: index.toString(),
    value: dest.value,
    element: (
      <div className="grid grid-cols-2 items-center flex-1">
        <p className="text-neutral text-lg leading-5 font-semibold">{dest.element}</p>
      </div>
    ),
  }));
};

type BondForm = {
  amount: string;
  destination: Address;
};

export type BondResult = {
  stake: string;
  accounts: AccountDS[];
  destination: Address;
};

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  identifiers: string[];
  asset: Asset;
  onResult: (data: BondResult) => void;
};

const InitOperation = ({ api, chainId, identifiers, asset, onResult }: Props) => {
  const { t } = useI18n();
  const { getLiveAssetBalances } = useBalance();
  const { getLiveAccounts } = useAccount();
  const { getLiveWallets } = useWallet();
  const { getTransactionFee } = useTransaction();
  const { getMaxValidators } = useValidators();

  const destinations = getDestinations(t);
  const dbAccounts = getLiveAccounts({ signingType: SigningType.PARITY_SIGNER });
  const wallets = getLiveWallets();
  const walletsMap = new Map(wallets.map((wallet) => [(wallet.id || '').toString(), wallet]));

  const [fee, setFee] = useState('');

  const [minBalance, setMinBalance] = useState<string>('0');
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [stakeAccounts, setStakeAccounts] = useState<DropdownOption<Address>[]>([]);
  const [activeStakeAccounts, setActiveStakeAccounts] = useState<DropdownResult<Address>[]>([]);
  const [activeDestination, setActiveDestination] = useState<RadioResult<RewardsDestination>>(destinations[0]);

  const [payoutAccounts, setPayoutAccounts] = useState<DropdownOption<Address>[]>([]);
  const [activeBalances, setActiveBalances] = useState<BalanceDS[]>([]);
  const [balancesMap, setBalancesMap] = useState<Map<string, BalanceDS>>(new Map());

  const totalAccounts = dbAccounts.filter((account) => {
    return account.id && identifiers.includes(account.id.toString());
  });

  const accountIds = totalAccounts.reduce<AccountId[]>((acc, account) => {
    if (account.accountId) {
      acc.push(account.accountId);
    }

    return acc;
  }, []);

  const balances = getLiveAssetBalances(accountIds, chainId, asset.assetId.toString());

  const {
    handleSubmit,
    control,
    watch,
    trigger,
    unregister,
    register,
    formState: { isValid },
  } = useForm<BondForm>({
    mode: 'onChange',
    defaultValues: { amount: '', destination: '' },
  });

  const amount = watch('amount');
  const destination = watch('destination');

  useEffect(() => {
    const newBalancesMap = new Map(balances.map((balance) => [balance.accountId, balance]));
    const newActiveBalances = activeStakeAccounts.map((a) => newBalancesMap.get(a.id as AccountId)) as BalanceDS[];

    setBalancesMap(newBalancesMap);
    setActiveBalances(newActiveBalances);
  }, [activeStakeAccounts.length, balances]);

  useEffect(() => {
    amount && trigger('amount');
  }, [activeBalances]);

  // Set balance range
  useEffect(() => {
    if (!activeBalances.length) return;

    const stakeableBalance = activeBalances.map(stakeableAmount);
    const minBalance = stakeableBalance.reduce<string>((acc, balance) => {
      if (!balance) return acc;

      return new BN(balance).lt(new BN(acc)) ? balance : acc;
    }, stakeableBalance[0]);

    setMinBalance(minBalance);
  }, [activeBalances]);

  // Init stake accounts
  useEffect(() => {
    const formattedAccounts = totalAccounts.map((account) => {
      const matchBalance = balancesMap.get(account.accountId || '0x');
      const wallet = account.walletId ? walletsMap.get(account.walletId.toString()) : undefined;

      return getDropdownPayload(account, wallet, matchBalance, asset, fee, amount);
    });

    setStakeAccounts(formattedAccounts);
  }, [totalAccounts.length, amount, fee, balancesMap]);

  // Init active stake accounts
  useEffect(() => {
    if (stakeAccounts.length === 0) return;

    const activeAccounts = stakeAccounts.map(({ id, value }) => ({ id, value }));
    setActiveStakeAccounts(activeAccounts);
  }, [stakeAccounts.length]);

  // Init payout wallets
  useEffect(() => {
    const payoutAccounts = dbAccounts.reduce<DropdownOption<Address>[]>((acc, account) => {
      if (!account.chainId || account.chainId === chainId) {
        const wallet = account.walletId ? walletsMap.get(account.walletId.toString()) : undefined;

        acc.push(getDropdownPayload(account, wallet));
      }

      return acc;
    }, []);

    setPayoutAccounts(payoutAccounts);
  }, [dbAccounts.length]);

  // Setup transactions
  useEffect(() => {
    const maxValidators = getMaxValidators(api);
    const transferableDestination = activeDestination?.value === RewardsDestination.TRANSFERABLE && destination;

    const newTransactions = activeStakeAccounts.map(({ value }) => {
      const bondTx = {
        chainId,
        type: TransactionType.BOND,
        address: value,
        args: {
          value: formatAmount(amount, asset.precision),
          controller: value,
          payee: transferableDestination ? { Account: destination } : 'Staked',
        },
      };

      const nominateTx = {
        chainId,
        type: TransactionType.NOMINATE,
        address: value,
        args: { targets: Array(maxValidators).fill(value) },
      };

      return {
        chainId,
        type: TransactionType.BATCH_ALL,
        address: value,
        args: { transactions: [bondTx, nominateTx] },
      };
    });

    setTransactions(newTransactions);
  }, [activeStakeAccounts.length, amount, activeDestination]);

  useEffect(() => {
    if (!amount || !transactions.length) return;

    getTransactionFee(transactions[0], api).then(setFee);
  }, [api, amount, transactions]);

  // unregister destination field if active radio is restake
  useEffect(() => {
    if (activeDestination?.value === RewardsDestination.RESTAKE) {
      unregister('destination');
    } else {
      register('destination');
    }
  }, [activeDestination?.value]);

  const submitBond: SubmitHandler<BondForm> = ({ amount, destination }) => {
    const selectedAddresses = activeStakeAccounts.map((stake) => stake.value);
    const accounts = totalAccounts.filter(
      (account) => account.accountId && selectedAddresses.includes(account.accountId),
    );

    const transferableDestination = activeDestination?.value === RewardsDestination.RESTAKE ? '' : destination;

    onResult({
      stake: formatAmount(amount, asset.precision),
      destination: transferableDestination,
      accounts: accounts,
    });
  };

  return (
    <Plate as="section" className="w-[600px] flex flex-col items-center mx-auto">
      <div className="w-full p-5 rounded-2lg bg-white shadow-surface">
        <Select
          weight="lg"
          placeholder={t('staking.bond.selectStakeAccountLabel')}
          summary={t('staking.bond.selectStakeAccountSummary')}
          activeIds={activeStakeAccounts.map((acc) => acc.id)}
          options={stakeAccounts}
          onChange={setActiveStakeAccounts}
        />
      </div>

      <form
        id="initBondForm"
        className="flex flex-col gap-y-5 p-5 w-full rounded-2lg bg-white mt-2.5 mb-5 shadow-surface"
        onSubmit={handleSubmit(submitBond)}
      >
        <Controller
          name="amount"
          control={control}
          rules={{
            required: true,
            validate: {
              notZero: (v) => Number(v) > 0,
              insufficientBalance: (amount) => activeBalances.every((b) => validateBalance(b, amount, asset)),
              insufficientBalanceForFee: (amount) =>
                activeBalances.every((b) => validateBalanceForFee(b, fee, amount, asset)),
            },
          }}
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <>
              <AmountInput
                placeholder={t('staking.bond.amountPlaceholder')}
                balancePlaceholder={t('staking.bond.availableBalancePlaceholder')}
                value={value}
                name="amount"
                balance={['0', minBalance]}
                asset={asset}
                invalid={Boolean(error)}
                onChange={onChange}
              />
              <InputHint active={error?.type === 'insufficientBalance'} variant="error">
                {t('staking.notEnoughBalanceError')}
              </InputHint>
              <InputHint active={error?.type === 'insufficientBalanceForFee'} variant="error">
                {t('staking.notEnoughBalanceForFeeError')}
              </InputHint>
              <InputHint active={error?.type === 'required'} variant="error">
                {t('staking.requiredAmountError')}
              </InputHint>
              <InputHint active={error?.type === 'notZero'} variant="error">
                {t('staking.requiredAmountError')}
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
            className="col-span-2"
            optionClass="p-2.5 rounded-2lg bg-shade-2 mt-2.5"
            activeId={activeDestination?.id}
            options={destinations}
            onChange={setActiveDestination}
          />
        </div>
        {activeDestination?.value === RewardsDestination.TRANSFERABLE && (
          <Controller
            name="destination"
            control={control}
            rules={{
              required: true,
              validate: {
                isAddress: (v) => isAddress(v),
              },
            }}
            render={({ field: { onChange }, fieldState: { error } }) => (
              <>
                <Combobox
                  variant="up"
                  label={t('staking.bond.payoutAccountLabel')}
                  placeholder={t('staking.bond.payoutAccountPlaceholder')}
                  options={payoutAccounts}
                  invalid={Boolean(error)}
                  suffixElement={
                    destination && (
                      <Button variant="text" pallet="dark" weight="xs" onClick={() => onChange(undefined)}>
                        <Icon name="clearOutline" size={20} />
                      </Button>
                    )
                  }
                  prefixElement={<Identicon address={destination} size={24} background={false} canCopy={false} />}
                  onChange={(option) => onChange(option.value)}
                />
                <InputHint active={error?.type === 'isAddress'} variant="error">
                  {t('staking.bond.incorrectAddressError')}
                </InputHint>
                <InputHint active={error?.type === 'required'} variant="error">
                  {t('staking.bond.requiredAddressError')}
                </InputHint>
              </>
            )}
          />
        )}

        <div className="flex justify-between items-center uppercase text-neutral-variant text-2xs">
          <p>{t('staking.bond.networkFee', { count: activeStakeAccounts.length })}</p>

          <Fee className="text-neutral font-semibold" api={api} asset={asset} transaction={transactions[0]} />
        </div>
      </form>

      <Button type="submit" form="initBondForm" variant="fill" pallet="primary" weight="lg" disabled={!isValid}>
        {t('staking.bond.continueButton')}
      </Button>
    </Plate>
  );
};

export default InitOperation;
