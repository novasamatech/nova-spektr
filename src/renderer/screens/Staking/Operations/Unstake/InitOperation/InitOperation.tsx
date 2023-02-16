import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import cn from 'classnames';
import { useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';

import { Fee } from '@renderer/components/common';
import { AmountInput, Balance, Button, HintList, Icon, Identicon, InputHint, Select } from '@renderer/components/ui';
import { Option as DropdownOption } from '@renderer/components/ui/Dropdowns/common/types';
import { ResultOption } from '@renderer/components/ui/RadioGroup/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { AccountID, ChainId, PublicKey, SigningType } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { useAccount } from '@renderer/services/account/accountService';
import { useBalance } from '@renderer/services/balance/balanceService';
import { formatAmount, transferableAmount } from '@renderer/services/balance/common/utils';
import { AccountDS, BalanceDS } from '@renderer/services/storage';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { StakingMap } from '@renderer/services/staking/common/types';
import { Stake } from '@renderer/domain/stake';
import { UnstakingDuration } from '../../../Overview/components';

const validateBalance = (stake: Stake | string, amount: string, asset: Asset): boolean => {
  const stakeableBalance = typeof stake === 'string' ? stake : stake.active;

  let formatedAmount = new BN(formatAmount(amount, asset.precision));

  return formatedAmount.lte(new BN(stakeableBalance));
};

const validateBalanceForFee = (balance: BalanceDS | string, fee: string): boolean => {
  const transferableBalance = typeof balance === 'string' ? balance : transferableAmount(balance);

  return new BN(fee).lte(new BN(transferableBalance));
};

const getDropdownPayload = (
  account: AccountDS,
  balance?: BalanceDS,
  stake?: Stake,
  asset?: Asset,
  fee?: string,
  amount?: string,
): DropdownOption<AccountID> => {
  const address = account.accountId || '';
  const publicKey = account.publicKey || '';
  const balanceExists = balance && stake && asset && fee && amount;

  const balanceIsAvailable =
    !balanceExists || (validateBalanceForFee(balance, fee) && validateBalance(stake, amount, asset));

  const element = (
    <div className="flex justify-between items-center gap-x-2.5">
      <div className="flex gap-x-[5px] items-center">
        <Identicon address={address} size={30} background={false} canCopy={false} />
        <p className="text-left text-neutral text-lg font-semibold">{account.name}</p>
      </div>
      {balanceExists && (
        <div className="flex items-center gap-x-1">
          {!balanceIsAvailable && <Icon size={12} className="text-error" name="warnCutout" />}

          <Balance
            className={cn(!balanceIsAvailable && 'text-error')}
            value={stake.active}
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

type UnstakeForm = {
  amount: string;
};

export type UnstakeResult = {
  accounts: AccountDS[];
  amount: string;
};

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  accountIds: string[];
  asset: Asset;
  staking?: StakingMap;
  onResult: (unstake: UnstakeResult) => void;
};

const InitOperation = ({ api, staking, chainId, accountIds, asset, onResult }: Props) => {
  const { t } = useI18n();
  const { getLiveAssetBalances } = useBalance();
  const { getLiveAccounts } = useAccount();
  const { getTransactionFee } = useTransaction();

  const accounts = getLiveAccounts({ signingType: SigningType.PARITY_SIGNER });

  const [fee, setFee] = useState('');
  const [stakedRange, setStakedRange] = useState<[string, string]>(['0', '0']);
  const [transferableRange, setTransferableRange] = useState<[string, string]>(['0', '0']);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [unstakeAccounts, setUnstakeAccounts] = useState<DropdownOption<AccountID>[]>([]);
  const [activeAccounts, setActiveAccounts] = useState<ResultOption<AccountID>[]>([]);

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
    formState: { isValid },
  } = useForm<UnstakeForm>({
    mode: 'onChange',
    defaultValues: { amount: '' },
  });

  const amount = watch('amount');

  // Set balances
  useEffect(() => {
    if (!activeAccounts.length || !staking) {
      setStakedRange(['0', '0']);
      setTransferableRange(['0', '0']);

      return;
    }

    const staked = activeAccounts.map((a) => staking?.[a.value]?.active || '0');

    const minMaxBalances = staked.reduce<[string, string]>(
      (acc, balance) => {
        if (!balance) return acc;

        acc[0] = new BN(balance).lt(new BN(acc[0])) ? balance : acc[0];
        acc[1] = new BN(balance).gt(new BN(acc[1])) ? balance : acc[1];

        return acc;
      },
      [staked[0], staked[0]],
    );

    setStakedRange(minMaxBalances);

    const transferable = activeAccounts.map((a) => transferableAmount(balancesMap.get(a.id as PublicKey)));

    const minMaxTransferable = transferable.reduce<[string, string]>(
      (acc, balance) => {
        if (!balance) return acc;

        acc[0] = new BN(balance).lt(new BN(acc[0])) ? balance : acc[0];
        acc[1] = new BN(balance).gt(new BN(acc[1])) ? balance : acc[1];

        return acc;
      },
      [transferable?.[0], transferable?.[0]],
    );

    setTransferableRange(minMaxTransferable);
  }, [balances, activeAccounts.length]);

  useEffect(() => {
    const balancesMap = new Map(balances.map((balance) => [balance.publicKey, balance]));

    setBalancesMap(balancesMap);
    setActiveBalances(activeAccounts.map((a) => balancesMap.get(a.id as PublicKey)) as BalanceDS[]);
  }, [activeAccounts.length, balances]);

  // Init accounts
  useEffect(() => {
    const formattedAccounts = selectedAccounts.map((a) => {
      const matchBalance = balances.find((b) => b.publicKey === a.publicKey);
      const stake = staking?.[a.accountId || ''];

      return getDropdownPayload(a, matchBalance, stake, asset, fee, amount);
    });

    setUnstakeAccounts(formattedAccounts);
    setActiveAccounts(formattedAccounts);
  }, [accountIds.length, amount, fee, balances.length]);

  // Setup transactions
  useEffect(() => {
    if (!stakedRange) return;

    const newTransactions = activeAccounts.map(({ value }) => {
      return {
        chainId,
        type: TransactionType.UNSTAKE,
        address: value,
        args: {
          value: formatAmount(amount, asset.precision),
        },
      };
    });

    setTransactions(newTransactions);
  }, [stakedRange, amount]);

  useEffect(() => {
    if (!amount || !transactions.length) return;

    (async () => {
      const transactionFee = await getTransactionFee(transactions[0], api);

      setFee(transactionFee);
    })();
  }, [amount]);

  const submitUnstake: SubmitHandler<UnstakeForm> = ({ amount }) => {
    const selectedAddresses = activeAccounts.map((stake) => stake.id);

    const accounts = selectedAccounts.filter(
      (account) => account.publicKey && selectedAddresses.includes(account.publicKey),
    );

    onResult({
      amount: formatAmount(amount, asset.precision),
      accounts,
    });
  };

  const transferable =
    transferableRange[0] === transferableRange[1] ? (
      <Balance value={transferableRange[0]} precision={asset.precision} />
    ) : (
      <>
        {/* eslint-disable-next-line i18next/no-literal-string */}
        <Balance value={transferableRange[0]} precision={asset.precision} /> -
        <Balance value={transferableRange[1]} precision={asset.precision} />
      </>
    );

  return (
    <div className="w-[600px] flex flex-col items-center mx-auto rounded-2lg bg-shade-2 p-5 ">
      <div className="w-full p-5 rounded-2lg bg-white shadow-surface">
        <Select
          weight="lg"
          placeholder={t('staking.bond.selectStakeAccountLabel')}
          summary={t('staking.bond.selectStakeAccountSummary')}
          activeIds={activeAccounts.map((w) => w.id.toString())}
          options={unstakeAccounts}
          onChange={setActiveAccounts}
        />
      </div>

      <form
        id="initUnstakeForm"
        className="flex flex-col gap-y-5 p-5 w-full rounded-2lg bg-white mt-2.5 mb-5 shadow-surface"
        onSubmit={handleSubmit(submitUnstake)}
      >
        <Controller
          name="amount"
          control={control}
          rules={{
            required: true,
            validate: {
              notZero: (v) => Number(v) > 0,
              insufficientBalance: (amount) =>
                activeAccounts.every((a) => validateBalance(staking?.[a.value] || '0', amount, asset)),
              insufficientBalanceForFee: () => activeBalances.every((b) => validateBalanceForFee(b, fee)),
            },
          }}
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <>
              <AmountInput
                placeholder={t('staking.unstake.amountPlaceholder')}
                balancePlaceholder={t('staking.unstake.stakedPlaceholder')}
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
          <p>{t('staking.unstake.transferable')}</p>

          <div className="flex text-neutral font-semibold">
            {transferable}&nbsp;{asset.symbol}
          </div>
        </div>

        <div className="flex justify-between items-center uppercase text-neutral-variant text-2xs">
          <p>{t('staking.unstake.networkFee', { count: activeAccounts.length })}</p>

          <Fee className="text-neutral font-semibold" api={api} asset={asset} transaction={transactions[0]} />
        </div>

        <HintList>
          <HintList.Item>
            {t('staking.unstake.durationDescription')}
            {'('}
            <UnstakingDuration className="ml-1" api={api} />
            {')'}
          </HintList.Item>
          <HintList.Item>{t('staking.unstake.noRewardsDescription')}</HintList.Item>
          <HintList.Item>{t('staking.unstake.redeemDescription')}</HintList.Item>
        </HintList>
      </form>

      <Button type="submit" form="initUnstakeForm" variant="fill" pallet="primary" weight="lg" disabled={!isValid}>
        {t('staking.bond.continueButton')}
      </Button>
    </div>
  );
};

export default InitOperation;
