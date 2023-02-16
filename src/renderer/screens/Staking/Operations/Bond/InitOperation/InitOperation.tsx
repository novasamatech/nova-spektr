import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import cn from 'classnames';
import { useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { isAddress } from '@polkadot/util-crypto';

import { Fee } from '@renderer/components/common';
import {
  Address,
  AmountInput,
  Balance,
  Button,
  Combobox,
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
import { AccountID, ChainId, PublicKey, SigningType } from '@renderer/domain/shared-kernel';
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
): DropdownOption<AccountID> => {
  const address = account.accountId || '';
  const publicKey = account.publicKey || '';
  const balanceExists = balance && asset && fee && amount;

  const balanceIsAvailable =
    !balanceExists || (validateBalanceForFee(balance, fee, amount, asset) && validateBalance(balance, amount, asset));

  const element = (
    <div className="flex justify-between items-center gap-x-2.5">
      <div className="flex gap-x-[5px] items-center">
        <Address
          address={address}
          name={account.name}
          subName={wallet?.name}
          signType={account.signingType}
          size={30}
          canCopy={false}
        />
      </div>
      {balanceExists && (
        <div className="flex items-center gap-x-1">
          {!balanceIsAvailable && <Icon size={12} className="text-error" name="warnCutout" />}

          <Balance
            className={cn(!balanceIsAvailable && 'text-error')}
            value={stakeableAmount(balance)}
            precision={asset.precision}
            symbol={asset.symbol}
          />
        </div>
      )}
    </div>
  );

  return {
    id: publicKey,
    value: address,
    element,
  };
};

type BondForm = {
  amount: string;
  destination: AccountID;
};

export type BondResult = {
  stake: string;
  accounts: AccountDS[];
  destination: AccountID;
};

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  accountIds: string[];
  asset: Asset;
  onResult: (data: BondResult) => void;
};

const InitOperation = ({ api, chainId, accountIds, asset, onResult }: Props) => {
  const { t } = useI18n();
  const { getLiveAssetBalances } = useBalance();
  const { getLiveAccounts } = useAccount();
  const { getLiveWallets } = useWallet();
  const { getTransactionFee } = useTransaction();
  const { getMaxValidators } = useValidators();

  const accounts = getLiveAccounts({ signingType: SigningType.PARITY_SIGNER });
  const wallets = getLiveWallets();
  const walletsMap = new Map(wallets.map((wallet) => [(wallet.id || '').toString(), wallet]));

  const [fee, setFee] = useState('');

  const [balanceRange, setBalanceRange] = useState<[string, string]>(['0', '0']);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [stakeAccounts, setStakeAccounts] = useState<DropdownOption<AccountID>[]>([]);
  const [activeAccounts, setActiveAccounts] = useState<ResultOption<AccountID>[]>([]);

  const [destinations, setDestinations] = useState<RadioOption<number>[]>([]);
  const [activeDestination, setActiveDestination] = useState<ResultOption<RewardsDestination>>();

  const [payoutAccounts, setPayoutAccounts] = useState<DropdownOption<AccountID>[]>([]);
  const [activeBalances, setActiveBalances] = useState<BalanceDS[]>([]);
  const [balancesMap, setBalancesMap] = useState<Map<string, BalanceDS>>(new Map());

  const selectedAccounts = accounts.filter((account) => {
    return account.id && accountIds.includes(account.id.toString());
  });

  const publicKeys = selectedAccounts.reduce<PublicKey[]>((acc, account) => {
    if (account.publicKey) {
      acc.push(account.publicKey);
    }

    return acc;
  }, []);

  const balances = getLiveAssetBalances(publicKeys, chainId, asset.assetId.toString());

  const {
    handleSubmit,
    control,
    watch,
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
    setBalancesMap(new Map(balances.map((balance) => [balance.publicKey, balance])));
    setActiveBalances(activeAccounts.map((a) => balancesMap.get(a.id as PublicKey)) as BalanceDS[]);
  }, [activeAccounts.length, balances]);

  // Set balance range
  useEffect(() => {
    if (!activeBalances.length) {
      setBalanceRange(['0', '0']);

      return;
    }

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

    setBalanceRange(minMaxBalances);
  }, [activeBalances.length]);

  // Init destinations
  useEffect(() => {
    const options = [
      { value: RewardsDestination.RESTAKE, element: t('staking.bond.restakeRewards') },
      { value: RewardsDestination.TRANSFERABLE, element: t('staking.bond.transferableRewards') },
    ];

    const formattedDestinations = options.map((dest, index) => ({
      id: index.toString(),
      value: dest.value,
      element: (
        <div className="grid grid-cols-2 items-center flex-1">
          <p className="text-neutral text-lg leading-5 font-semibold">{dest.element}</p>
        </div>
      ),
    }));

    setDestinations(formattedDestinations);
  }, []);

  // Init stake accounts
  useEffect(() => {
    const formattedAccounts = selectedAccounts.map((account) => {
      const matchBalance = balancesMap.get(account.publicKey || '0x');
      const wallet = account.walletId ? walletsMap.get(account.walletId.toString()) : undefined;

      return getDropdownPayload(account, wallet, matchBalance, asset, fee, amount);
    });

    setStakeAccounts(formattedAccounts);
    setActiveAccounts(formattedAccounts);
  }, [accountIds.length, amount, fee, balancesMap.size]);

  // Init payout wallets
  useEffect(() => {
    const payoutAccounts = accounts.reduce<DropdownOption<AccountID>[]>((acc, account) => {
      if (!account.chainId || account.chainId === chainId) {
        const wallet = account.walletId ? walletsMap.get(account.walletId.toString()) : undefined;

        acc.push(getDropdownPayload(account, wallet));
      }

      return acc;
    }, []);

    setPayoutAccounts(payoutAccounts);
  }, [accounts.length]);

  // Setup transactions
  useEffect(() => {
    const maxValidators = getMaxValidators(api);
    const transferableDestination = activeDestination?.value === RewardsDestination.TRANSFERABLE && destination;

    const newTransactions = activeAccounts.map(({ value }) => {
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
        args: {
          targets: Array(maxValidators).fill(value),
        },
      };

      return {
        chainId,
        type: TransactionType.BATCH_ALL,
        address: value,
        args: { transactions: [bondTx, nominateTx] },
      };
    });

    setTransactions(newTransactions);
  }, [amount, activeDestination, destination]);

  useEffect(() => {
    if (!amount || !transactions.length) return;

    (async () => {
      const transactionFee = await getTransactionFee(transactions[0], api);

      setFee(transactionFee);
    })();
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
    const selectedAddresses = activeAccounts.map((stake) => stake.value);
    const accounts = selectedAccounts.filter(
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
    <div className="w-[600px] flex flex-col items-center mx-auto rounded-2lg bg-shade-2 p-5 ">
      <div className="w-full p-5 rounded-2lg bg-white shadow-surface">
        <Select
          weight="lg"
          placeholder={t('staking.bond.selectStakeAccountLabel')}
          summary={t('staking.bond.selectStakeAccountSummary')}
          activeIds={activeAccounts.map((a) => a.id.toString())}
          options={stakeAccounts}
          onChange={setActiveAccounts}
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
                balance={balanceRange[0] === balanceRange[1] ? balanceRange[0] : balanceRange}
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
            activeId={activeDestination?.id}
            options={destinations}
            className="col-span-2"
            optionClass="p-2.5 rounded-2lg bg-shade-2 mt-2.5"
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
          <p>{t('staking.bond.networkFee', { count: activeAccounts.length })}</p>

          <Fee className="text-neutral font-semibold" api={api} asset={asset} transaction={transactions[0]} />
        </div>
      </form>

      <Button type="submit" form="initBondForm" variant="fill" pallet="primary" weight="lg" disabled={!isValid}>
        {t('staking.bond.continueButton')}
      </Button>
    </div>
  );
};

export default InitOperation;
