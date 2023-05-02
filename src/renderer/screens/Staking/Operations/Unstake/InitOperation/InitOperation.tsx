import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { useEffect, useState } from 'react';
import cn from 'classnames';

import { Fee } from '@renderer/components/common';
import { Balance, Block, HintList, Plate, Select, Icon } from '@renderer/components/ui';
import { DropdownOption, DropdownResult } from '@renderer/components/ui/Dropdowns/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Address, ChainId, AccountId } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { useAccount } from '@renderer/services/account/accountService';
import { useBalance } from '@renderer/services/balance/balanceService';
import { formatAmount, transferableAmount } from '@renderer/shared/utils/balance';
import { AccountDS, BalanceDS } from '@renderer/services/storage';
import { StakingMap } from '@renderer/services/staking/common/types';
import { UnstakingDuration } from '../../../Overview/components';
import { getUnstakeAccountOption, getTotalAccounts, validateBalanceForFee, validateUnstake } from '../../common/utils';
import { nonNullable } from '@renderer/shared/utils/functions';
import { Balance as AccountBalance } from '@renderer/domain/balance';
import { OperationForm } from '@renderer/screens/Staking/Operations/components';

export type UnstakeResult = {
  accounts: AccountDS[];
  amount: string;
};

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  addressPrefix: number;
  identifiers: string[];
  asset: Asset;
  staking: StakingMap;
  onResult: (unstake: UnstakeResult) => void;
};

const InitOperation = ({ api, chainId, addressPrefix, staking, identifiers, asset, onResult }: Props) => {
  const { t } = useI18n();
  const { getLiveAssetBalances } = useBalance();
  const { getLiveAccounts } = useAccount();

  const dbAccounts = getLiveAccounts();

  const [fee, setFee] = useState('');
  const [amount, setAmount] = useState('');

  const [stakedRange, setStakedRange] = useState<[string, string]>(['0', '0']);
  const [transferableRange, setTransferableRange] = useState<[string, string]>(['0', '0']);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [unstakeAccounts, setUnstakeAccounts] = useState<DropdownOption<Address>[]>([]);
  const [activeUnstakeAccounts, setActiveUnstakeAccounts] = useState<DropdownResult<Address>[]>([]);

  const [activeBalances, setActiveBalances] = useState<BalanceDS[]>([]);

  const totalAccounts = getTotalAccounts(dbAccounts, identifiers);

  const accountIds = totalAccounts.map((account) => account.accountId);
  const balances = getLiveAssetBalances(accountIds, chainId, asset.assetId.toString());

  useEffect(() => {
    const balancesMap = new Map(balances.map((balance) => [balance.accountId, balance]));
    const newActiveBalances = activeUnstakeAccounts
      .map((a) => balancesMap.get(a.id as AccountId))
      .filter(nonNullable) as AccountBalance[];

    setActiveBalances(newActiveBalances);
  }, [activeUnstakeAccounts.length, balances]);

  useEffect(() => {
    if (!Object.keys(staking).length) return;

    const staked = activeUnstakeAccounts.map((a) => staking[a.id]?.active || '0');
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
  }, [activeUnstakeAccounts.length, staking]);

  useEffect(() => {
    if (!activeUnstakeAccounts.length) return;

    const balancesMap = new Map(balances.map((balance) => [balance.accountId, balance]));
    const transferable = activeUnstakeAccounts.map((a) => transferableAmount(balancesMap.get(a.id as AccountId)));
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
  }, [activeUnstakeAccounts.length, activeBalances]);

  useEffect(() => {
    const formattedAccounts = totalAccounts.map((account) => {
      const balance = activeBalances.find((b) => b.accountId === account.accountId);
      const stake = staking[account.accountId];

      return getUnstakeAccountOption(account, { balance, stake, asset, addressPrefix, fee, amount });
    });

    setUnstakeAccounts(formattedAccounts);
  }, [totalAccounts.length, staking, amount, fee, activeBalances]);

  useEffect(() => {
    if (unstakeAccounts.length === 0) return;

    const activeAccounts = unstakeAccounts.map(({ id, value }) => ({ id, value }));
    setActiveUnstakeAccounts(activeAccounts);
  }, [unstakeAccounts.length]);

  useEffect(() => {
    if (!stakedRange) return;

    const newTransactions = activeUnstakeAccounts.map(({ value }) => {
      return {
        chainId,
        type: TransactionType.UNSTAKE,
        address: value,
        args: { value: formatAmount(amount, asset.precision) },
      };
    });

    setTransactions(newTransactions);
  }, [stakedRange, amount]);

  const submitUnstake = (data: { amount: string }) => {
    const selectedAccountIds = activeUnstakeAccounts.map((stake) => stake.id);
    const accounts = totalAccounts.filter((account) => selectedAccountIds.includes(account.accountId));

    onResult({
      accounts,
      amount: formatAmount(data.amount, asset.precision),
    });
  };

  const validateBalance = (amount: string): boolean => {
    return activeUnstakeAccounts.every((a) => validateUnstake(staking[a.id] || '0', amount, asset.precision));
  };

  const validateFee = (): boolean => {
    return activeBalances.every((b) => validateBalanceForFee(b, fee));
  };

  const transferable =
    transferableRange[0] === transferableRange[1] ? (
      <Balance value={transferableRange[0]} precision={asset.precision} />
    ) : (
      <>
        <Balance value={transferableRange[0]} precision={asset.precision} />
        {' - '}
        <Balance value={transferableRange[1]} precision={asset.precision} />
      </>
    );

  return (
    <Plate as="section" className="w-[600px] flex flex-col items-center mx-auto">
      <Block className="p-5 mb-2.5">
        <Select
          weight="lg"
          placeholder={t('staking.bond.selectStakeAccountLabel')}
          summary={t('staking.bond.selectStakeAccountSummary')}
          activeIds={activeUnstakeAccounts.map((acc) => acc.id)}
          options={unstakeAccounts}
          onChange={setActiveUnstakeAccounts}
        />
      </Block>

      <OperationForm
        chainId={chainId}
        canSubmit={activeUnstakeAccounts.length > 0}
        addressPrefix={addressPrefix}
        fields={['amount']}
        balanceRange={stakedRange}
        asset={asset}
        validateBalance={validateBalance}
        validateFee={validateFee}
        onSubmit={submitUnstake}
        onFormChange={({ amount }) => {
          setAmount(amount);
        }}
      >
        {(errorType) => {
          const hasFeeError = errorType === 'insufficientBalanceForFee';

          return (
            <>
              <div className="flex justify-between items-center uppercase text-neutral-variant text-2xs">
                <p>{t('staking.unstake.transferable')}</p>

                <div className={cn('flex font-semibold', hasFeeError ? 'text-error' : 'text-neutral')}>
                  {hasFeeError && <Icon className="text-error mr-1" name="warnCutout" size={12} />}
                  {transferable}&nbsp;{asset.symbol}
                </div>
              </div>

              <div className="flex justify-between items-center uppercase text-neutral-variant text-2xs">
                <p>{t('staking.unstake.networkFee', { count: activeUnstakeAccounts.length })}</p>

                <Fee
                  className="text-neutral font-semibold"
                  api={api}
                  asset={asset}
                  transaction={transactions[0]}
                  onFeeChange={setFee}
                />
              </div>

              <HintList>
                <HintList.Item>
                  {t('staking.unstake.durationHint')} {'('}
                  <UnstakingDuration className="ml-1" api={api} />
                  {')'}
                </HintList.Item>
                <HintList.Item>{t('staking.unstake.noRewardsHint')}</HintList.Item>
                <HintList.Item>{t('staking.unstake.redeemHint')}</HintList.Item>
              </HintList>
            </>
          );
        }}
      </OperationForm>
    </Plate>
  );
};

export default InitOperation;
