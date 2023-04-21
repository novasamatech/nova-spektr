import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import cn from 'classnames';
import { useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';

import { Fee } from '@renderer/components/common';
import { AmountInput, Balance, Button, HintList, Icon, Identicon, InputHint, Select } from '@renderer/components/ui';
import { DropdownOption, DropdownResult } from '@renderer/components/ui/Dropdowns/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Address, ChainId, AccountId } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { useAccount } from '@renderer/services/account/accountService';
import { useBalance } from '@renderer/services/balance/balanceService';
import { formatAmount, stakeableAmount, transferableAmount } from '@renderer/services/balance/common/utils';
import { AccountDS, BalanceDS } from '@renderer/services/storage';
import { useTransaction } from '@renderer/services/transaction/transactionService';

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
  balance?: BalanceDS,
  asset?: Asset,
  fee?: string,
  amount?: string,
): DropdownOption<Address> => {
  const address = account.accountId || '';
  const accountId = account.accountId || '';
  const balanceExists = !!(balance && asset);

  const balanceIsIncorrect =
    balanceExists &&
    amount &&
    fee &&
    !(validateBalanceForFee(balance, fee, amount, asset) && validateBalance(balance, amount, asset));

  const element = (
    <div className="flex justify-between items-center gap-x-2.5">
      <div className="flex gap-x-[5px] items-center">
        <Identicon address={address} size={30} background={false} canCopy={false} />
        <p className="text-left text-neutral text-lg font-semibold">{account.name}</p>
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

type StakeMoreForm = {
  amount: string;
};

export type StakeMoreResult = {
  accounts: AccountDS[];
  amount: string;
};

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  identifiers: string[];
  asset: Asset;
  onResult: (stakeMore: StakeMoreResult) => void;
};

const InitOperation = ({ api, chainId, identifiers, asset, onResult }: Props) => {
  const { t } = useI18n();
  const { getLiveAssetBalances } = useBalance();
  const { getLiveAccounts } = useAccount();
  const { getTransactionFee } = useTransaction();

  const dbAccounts = getLiveAccounts();

  const [fee, setFee] = useState('');
  const [stakedRange, setStakedRange] = useState<[string, string]>(['0', '0']);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [unstakeAccounts, setUnstakeAccounts] = useState<DropdownOption<Address>[]>([]);
  const [activeUnstakeAccounts, setActiveUnstakeAccounts] = useState<DropdownResult<Address>[]>([]);

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
    formState: { isValid },
  } = useForm<StakeMoreForm>({
    mode: 'onChange',
    defaultValues: { amount: '' },
  });

  const amount = watch('amount');

  // Set balances
  useEffect(() => {
    if (!activeBalances.length) return;

    const stakeableBalance = activeBalances.map(stakeableAmount);
    const minMaxBalances = stakeableBalance.reduce<[string, string]>(
      (acc, balance) => {
        if (!balance) return acc;

        acc[0] = new BN(balance).lt(new BN(acc[0])) ? balance : acc[0];
        acc[1] = new BN(balance).gt(new BN(acc[1])) ? balance : acc[1];

        return acc;
      },
      [stakeableBalance[0], stakeableBalance[0]],
    );

    setStakedRange(minMaxBalances);
  }, [activeBalances]);

  useEffect(() => {
    const newBalancesMap = new Map(balances.map((balance) => [balance.accountId, balance]));
    const newActiveBalances = activeUnstakeAccounts.map((a) => newBalancesMap.get(a.id as AccountId)) as BalanceDS[];

    setBalancesMap(newBalancesMap);
    setActiveBalances(newActiveBalances);
  }, [activeUnstakeAccounts.length, balances]);

  useEffect(() => {
    amount && trigger('amount');
  }, [activeBalances]);

  // Init accounts
  useEffect(() => {
    const formattedAccounts = totalAccounts.map((account) => {
      const matchBalance = balancesMap.get(account.accountId || '0x');

      return getDropdownPayload(account, matchBalance, asset, fee, amount);
    });

    setUnstakeAccounts(formattedAccounts);
  }, [totalAccounts.length, amount, fee, balancesMap]);

  // Init active unstake accounts
  useEffect(() => {
    if (unstakeAccounts.length === 0) return;

    const activeAccounts = unstakeAccounts.map(({ id, value }) => ({ id, value }));
    setActiveUnstakeAccounts(activeAccounts);
  }, [unstakeAccounts.length]);

  // Setup transactions
  useEffect(() => {
    if (!stakedRange) return;

    const newTransactions = activeUnstakeAccounts.map(({ value }) => {
      return {
        chainId,
        type: TransactionType.STAKE_MORE,
        address: value,
        args: { maxAdditional: formatAmount(amount, asset.precision) },
      };
    });

    setTransactions(newTransactions);
  }, [stakedRange, amount]);

  useEffect(() => {
    if (!amount || !transactions.length) return;

    getTransactionFee(transactions[0], api).then(setFee);
  }, [amount]);

  const submitStakeMore: SubmitHandler<StakeMoreForm> = ({ amount }) => {
    const selectedAddresses = activeUnstakeAccounts.map((stake) => stake.id);

    const accounts = totalAccounts.filter(
      (account) => account.accountId && selectedAddresses.includes(account.accountId),
    );

    onResult({
      amount: formatAmount(amount, asset.precision),
      accounts,
    });
  };

  return (
    <div className="w-[600px] flex flex-col items-center mx-auto rounded-2lg bg-shade-2 p-5 ">
      <div className="w-full p-5 rounded-2lg bg-white shadow-surface">
        <Select
          weight="lg"
          placeholder={t('staking.bond.selectStakeAccountLabel')}
          summary={t('staking.bond.selectStakeAccountSummary')}
          activeIds={activeUnstakeAccounts.map((acc) => acc.id)}
          options={unstakeAccounts}
          onChange={setActiveUnstakeAccounts}
        />
      </div>

      <form
        id="initStakeMoreForm"
        className="flex flex-col gap-y-5 p-5 w-full rounded-2lg bg-white mt-2.5 mb-5 shadow-surface"
        onSubmit={handleSubmit(submitStakeMore)}
      >
        <Controller
          name="amount"
          control={control}
          rules={{
            required: true,
            validate: {
              notZero: (v) => Number(v) > 0,
              insufficientBalance: (amount) => activeBalances.every((b) => validateBalance(b || '0', amount, asset)),
              insufficientBalanceForFee: (amount) =>
                activeBalances.every((b) => validateBalanceForFee(b, fee, amount, asset)),
            },
          }}
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <>
              <AmountInput
                placeholder={t('staking.unstake.amountPlaceholder')}
                balancePlaceholder={t('staking.stakeMore.availablePlaceholder')}
                value={value}
                name="amount"
                balance={stakedRange[0] === stakedRange[1] ? stakedRange[0] : stakedRange}
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

        <div className="flex justify-between items-center uppercase text-neutral-variant text-2xs">
          <p>{t('staking.unstake.networkFee', { count: activeUnstakeAccounts.length })}</p>

          <Fee className="text-neutral font-semibold" api={api} asset={asset} transaction={transactions[0]} />
        </div>

        <HintList>
          <HintList.Item>{t('staking.stakeMore.eraHint')}</HintList.Item>
        </HintList>
      </form>

      <Button type="submit" form="initStakeMoreForm" variant="fill" pallet="primary" weight="lg" disabled={!isValid}>
        {t('staking.bond.continueButton')}
      </Button>
    </div>
  );
};

export default InitOperation;
