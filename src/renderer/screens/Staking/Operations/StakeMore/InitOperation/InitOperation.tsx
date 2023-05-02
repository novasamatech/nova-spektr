import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { useEffect, useState } from 'react';

import { Fee } from '@renderer/components/common';
import { HintList, Select, Block, Plate } from '@renderer/components/ui';
import { DropdownOption, DropdownResult } from '@renderer/components/ui/Dropdowns/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Balance, Balance as AccountBalance } from '@renderer/domain/balance';
import { ChainId, AccountId } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { useAccount } from '@renderer/services/account/accountService';
import { useBalance } from '@renderer/services/balance/balanceService';
import { formatAmount, stakeableAmount } from '@renderer/shared/utils/balance';
import { AccountDS } from '@renderer/services/storage';
import { nonNullable } from '@renderer/shared/utils/functions';
import { getStakeAccountOption, getTotalAccounts, validateBalanceForFee, validateStake } from '../../common/utils';
import { OperationForm } from '../../components';
import { toAddress } from '@renderer/shared/utils/address';
import { Account } from '@renderer/domain/account';

export type StakeMoreResult = {
  accounts: AccountDS[];
  amount: string;
};

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  addressPrefix: number;
  identifiers: string[];
  asset: Asset;
  onResult: (stakeMore: StakeMoreResult) => void;
};

const InitOperation = ({ api, chainId, addressPrefix, identifiers, asset, onResult }: Props) => {
  const { t } = useI18n();
  const { getLiveAssetBalances } = useBalance();
  const { getLiveAccounts } = useAccount();

  const dbAccounts = getLiveAccounts();

  const [fee, setFee] = useState('');
  const [amount, setAmount] = useState('');

  const [stakedRange, setStakedRange] = useState<[string, string]>(['0', '0']);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [stakeMoreAccounts, setStakeMoreAccounts] = useState<DropdownOption<Account>[]>([]);
  const [activeStakeMoreAccounts, setActiveStakeMoreAccounts] = useState<DropdownResult<Account>[]>([]);

  const [activeBalances, setActiveBalances] = useState<Balance[]>([]);

  const totalAccounts = getTotalAccounts(dbAccounts, identifiers);

  const accountIds = totalAccounts.map((account) => account.accountId);
  const balances = getLiveAssetBalances(accountIds, chainId, asset.assetId.toString());

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
    const balancesMap = new Map(balances.map((balance) => [balance.accountId, balance]));
    const newActiveBalances = activeStakeMoreAccounts
      .map((a) => balancesMap.get(a.id as AccountId))
      .filter(nonNullable) as AccountBalance[];

    setActiveBalances(newActiveBalances);
  }, [activeStakeMoreAccounts.length, balances]);

  useEffect(() => {
    const formattedAccounts = totalAccounts.map((account) => {
      const balance = activeBalances.find((b) => b.accountId === account.accountId);

      return getStakeAccountOption(account, { balance, asset, fee, addressPrefix, amount });
    });

    setStakeMoreAccounts(formattedAccounts);
  }, [totalAccounts.length, amount, fee, activeBalances]);

  useEffect(() => {
    if (stakeMoreAccounts.length === 0) return;

    const activeAccounts = stakeMoreAccounts.map(({ id, value }) => ({ id, value }));
    setActiveStakeMoreAccounts(activeAccounts);
  }, [stakeMoreAccounts.length]);

  useEffect(() => {
    if (!stakedRange) return;

    const newTransactions = activeStakeMoreAccounts.map(({ id }) => {
      return {
        chainId,
        type: TransactionType.STAKE_MORE,
        address: toAddress(id, { prefix: addressPrefix }),
        args: { maxAdditional: formatAmount(amount, asset.precision) },
      };
    });

    setTransactions(newTransactions);
  }, [stakedRange, amount]);

  const submitStakeMore = (data: { amount: string }) => {
    const selectedAccountIds = activeStakeMoreAccounts.map((stake) => stake.id);
    const accounts = totalAccounts.filter((account) => selectedAccountIds.includes(account.accountId));

    onResult({
      accounts,
      amount: formatAmount(data.amount, asset.precision),
    });
  };

  const validateBalance = (amount: string): boolean => {
    return activeBalances.every((b) => validateStake(b, amount, asset.precision));
  };

  const validateFee = (): boolean => {
    const feeIsValid = activeBalances.every((b) => validateBalanceForFee(b, fee));
    const balanceIsValid = activeBalances.every((b) => validateStake(b, amount, asset.precision, fee));

    return feeIsValid && balanceIsValid;
  };

  return (
    <Plate as="section" className="w-[600px] flex flex-col items-center mx-auto">
      <Block className="p-5 mb-2.5">
        <Select
          weight="lg"
          placeholder={t('staking.bond.selectStakeAccountLabel')}
          summary={t('staking.bond.selectStakeAccountSummary')}
          activeIds={activeStakeMoreAccounts.map((acc) => acc.id)}
          options={stakeMoreAccounts}
          onChange={setActiveStakeMoreAccounts}
        />
      </Block>

      <OperationForm
        chainId={chainId}
        canSubmit={activeStakeMoreAccounts.length > 0}
        addressPrefix={addressPrefix}
        fields={['amount']}
        asset={asset}
        balanceRange={stakedRange}
        validateBalance={validateBalance}
        validateFee={validateFee}
        onSubmit={submitStakeMore}
        onFormChange={({ amount }) => {
          setAmount(amount);
        }}
      >
        <div className="flex justify-between items-center uppercase text-neutral-variant text-2xs">
          <p>{t('staking.unstake.networkFee', { count: activeStakeMoreAccounts.length })}</p>

          <Fee
            className="text-neutral font-semibold"
            api={api}
            asset={asset}
            transaction={transactions[0]}
            onFeeChange={setFee}
          />
        </div>

        <HintList>
          <HintList.Item>{t('staking.stakeMore.eraHint')}</HintList.Item>
        </HintList>
      </OperationForm>
    </Plate>
  );
};

export default InitOperation;
