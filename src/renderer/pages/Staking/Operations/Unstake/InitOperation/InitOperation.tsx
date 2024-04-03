import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { useEffect, useState } from 'react';
import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { Transaction, TransactionType, OperationError } from '@entities/transaction';
import type { Account, Asset, Balance as AccountBalance, ChainId, AccountId, Wallet } from '@shared/core';
import { formatAmount, nonNullable, toAddress } from '@shared/lib/utils';
import { StakingMap, useStakingData } from '@entities/staking';
import { OperationForm } from '@pages/Staking/Operations/components';
import { OperationFooter, OperationHeader } from '@features/operations';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import {
  getUnstakeAccountOption,
  validateBalanceForFee,
  validateUnstake,
  validateBalanceForFeeDeposit,
  getSignatoryOption,
} from '../../common/utils';
import { useAssetBalances } from '@entities/balance';

export type UnstakeResult = {
  accounts: Account[];
  amount: string;
  signer?: Account;
  description?: string;
  withChill: boolean[];
};

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  accounts: Account[];
  addressPrefix: number;
  asset: Asset;
  onResult: (data: UnstakeResult) => void;
};

const InitOperation = ({ api, chainId, addressPrefix, accounts, asset, onResult }: Props) => {
  const { t } = useI18n();
  const activeWallet = useUnit(walletModel.$activeWallet);

  const { subscribeStaking, getMinNominatorBond } = useStakingData();

  const [fee, setFee] = useState('');
  const [feeLoading, setFeeLoading] = useState(true);
  const [deposit, setDeposit] = useState('');
  const [amount, setAmount] = useState('');
  const [staking, setStaking] = useState<StakingMap>({});

  const [minBalance, setMinBalance] = useState('0');
  const [minimumStake, setMinimumStake] = useState('0');

  const [activeUnstakeAccounts, setActiveUnstakeAccounts] = useState<Account[]>([]);
  const [activeSignatory, setActiveSignatory] = useState<Account>();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeBalances, setActiveBalances] = useState<AccountBalance[]>([]);

  const firstAccount = activeUnstakeAccounts[0] || accounts[0];
  const isMultisigWallet = walletUtils.isMultisig(activeWallet);
  const isMultisigAccount = firstAccount && accountUtils.isMultisigAccount(firstAccount);
  const formFields = isMultisigWallet ? [{ name: 'amount' }, { name: 'description' }] : [{ name: 'amount' }];

  const accountIds = accounts.map((account) => account.accountId);
  const balances = useAssetBalances({
    accountIds,
    chainId,
    assetId: asset.assetId.toString(),
  });

  const signatoryIds = isMultisigAccount ? firstAccount.signatories.map((s) => s.accountId) : [];
  const signatoriesBalances = useAssetBalances({
    accountIds: signatoryIds,
    chainId,
    assetId: asset.assetId.toString(),
  });
  const signerBalance = signatoriesBalances.find((b) => b.accountId === activeSignatory?.accountId);

  useEffect(() => {
    getMinNominatorBond(api).then(setMinimumStake);
  }, [api]);

  useEffect(() => {
    if (accounts.length === 0) return;

    setActiveUnstakeAccounts(accounts);
  }, [accounts.length]);

  useEffect(() => {
    const addresses = activeUnstakeAccounts.map((stake) => toAddress(stake.accountId, { prefix: addressPrefix }));

    let unsubStaking: () => void | undefined;
    (async () => {
      unsubStaking = await subscribeStaking(chainId, api, addresses, setStaking);
    })();

    return () => {
      unsubStaking?.();
    };
  }, [api, activeUnstakeAccounts.length]);

  useEffect(() => {
    const balancesMap = new Map(balances.map((balance) => [balance.accountId, balance]));
    const newActiveBalances = activeUnstakeAccounts
      .map((a) => balancesMap.get(a.accountId))
      .filter(nonNullable) as AccountBalance[];

    setActiveBalances(newActiveBalances);
  }, [activeUnstakeAccounts.length, balances]);

  useEffect(() => {
    if (!Object.keys(staking).length) return;

    const stakedBalances = activeUnstakeAccounts.map((a) => {
      const address = toAddress(a.accountId, { prefix: addressPrefix });

      return staking[address]?.active || '0';
    });

    const minStakedBalance = stakedBalances.reduce<string>((acc, balance) => {
      if (!balance) return acc;

      return new BN(balance).lt(new BN(acc)) ? balance : acc;
    }, stakedBalances[0]);

    setMinBalance(minStakedBalance);
  }, [activeUnstakeAccounts.length, staking]);

  useEffect(() => {
    const newTransactions = activeUnstakeAccounts.map(({ accountId }) => {
      return {
        chainId,
        type: TransactionType.UNSTAKE,
        address: toAddress(accountId, { prefix: addressPrefix }),
        args: { value: formatAmount(amount, asset.precision) },
      };
    });

    setTransactions(newTransactions);
  }, [minBalance, amount]);

  const getAccountDropdownOption = (account: Account) => {
    const balance = balances.find((b) => b.accountId === account.accountId);
    const address = toAddress(account.accountId, { prefix: addressPrefix });
    const stake = staking[address];

    return getUnstakeAccountOption(account, { balance, stake, asset, addressPrefix, fee, amount });
  };

  const getSignatoryDropdownOption = (wallet: Wallet, account: Account) => {
    const balance = signatoriesBalances.find((b) => b.accountId === account.accountId);

    return getSignatoryOption(wallet, account, { balance, asset, addressPrefix, fee, deposit });
  };

  const submitUnstake = (data: { amount: string; description?: string }) => {
    const selectedAccountIds = activeUnstakeAccounts.map((stake) => stake.accountId);
    const selectedAccounts = accounts.filter((account) => selectedAccountIds.includes(account.accountId));
    const amount = formatAmount(data.amount, asset.precision);

    const withChill = selectedAccounts.map((a) => {
      const address = toAddress(a.accountId, { prefix: addressPrefix });
      const leftAmount = new BN(staking[address]?.active || 0).sub(new BN(amount));

      return leftAmount.lte(new BN(minimumStake));
    });

    onResult({
      amount,
      withChill,
      accounts: selectedAccounts,
      ...(isMultisigWallet && {
        description: data.description || t('transactionMessage.unstake', { amount: data.amount, asset: asset.symbol }),
        signer: activeSignatory,
      }),
    });
  };

  const validateBalance = (amount: string): boolean => {
    return activeUnstakeAccounts.every((a) => {
      const address = toAddress(a.accountId, { prefix: addressPrefix });

      return validateUnstake(staking[address] || '0', amount, asset.precision);
    });
  };

  const validateFee = (): boolean => {
    if (!isMultisigWallet) {
      return activeBalances.every((b) => validateBalanceForFee(b, fee));
    }

    if (!signerBalance) return false;

    return validateBalanceForFee(signerBalance, fee);
  };

  const validateDeposit = (): boolean => {
    if (!isMultisigWallet) return true;
    if (!signerBalance) return false;

    return validateBalanceForFeeDeposit(signerBalance, deposit, fee);
  };

  const getBalanceRange = (): string | string[] => {
    if (activeSignatory) return minBalance;

    return activeBalances.length > 1 ? ['0', minBalance] : minBalance;
  };

  const getActiveAccounts = (): AccountId[] => {
    if (!isMultisigWallet) return activeUnstakeAccounts.map((acc) => acc.accountId);

    return activeSignatory ? [activeSignatory.accountId] : [];
  };

  const canSubmit = !feeLoading && (activeUnstakeAccounts.length > 0 || Boolean(activeSignatory));

  return (
    <div className="flex flex-col gap-y-4 w-[440px] px-5 py-4">
      <OperationForm
        chainId={chainId}
        accounts={getActiveAccounts()}
        canSubmit={canSubmit}
        addressPrefix={addressPrefix}
        fields={formFields}
        balanceRange={getBalanceRange()}
        asset={asset}
        validateBalance={validateBalance}
        validateFee={validateFee}
        validateDeposit={validateDeposit}
        header={({ invalidBalance, invalidFee, invalidDeposit }) => (
          <OperationHeader
            chainId={chainId}
            accounts={accounts}
            isMultiselect
            errors={invalidDeposit || invalidFee || invalidBalance ? [OperationError.EMPTY_ERROR] : undefined}
            getSignatoryOption={getSignatoryDropdownOption}
            getAccountOption={getAccountDropdownOption}
            onSignatoryChange={setActiveSignatory}
            onAccountChange={setActiveUnstakeAccounts}
          />
        )}
        footer={
          <OperationFooter
            api={api}
            asset={asset}
            account={firstAccount}
            totalAccounts={activeUnstakeAccounts.length}
            feeTx={transactions[0]}
            onFeeChange={setFee}
            onFeeLoading={setFeeLoading}
            onDepositChange={setDeposit}
          />
        }
        onSubmit={submitUnstake}
        onAmountChange={setAmount}
      />
    </div>
  );
};

export default InitOperation;
