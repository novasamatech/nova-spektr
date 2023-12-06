import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { useEffect, useState } from 'react';
import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { Transaction, TransactionType, OperationError } from '@entities/transaction';
import { formatAmount, stakeableAmount, nonNullable, toAddress } from '@shared/lib/utils';
import { OperationFooter, OperationHeader } from '@renderer/features/operation';
import { walletUtils, accountUtils, walletModel } from '@entities/wallet';
import type { Account, Asset, Balance as AccountBalance, ChainId, AccountId, Balance, Wallet } from '@shared/core';
import { OperationForm } from '../../components';
import {
  getStakeAccountOption,
  validateBalanceForFee,
  validateStake,
  validateBalanceForFeeDeposit,
  getSignatoryOption,
} from '../../common/utils';
import { useAssetBalances } from '@entities/balance';

export type StakeMoreResult = {
  accounts: Account[];
  amount: string;
  signer?: Account;
  description?: string;
};

type Props = {
  api: ApiPromise;
  accounts: Account[];
  chainId: ChainId;
  addressPrefix: number;
  asset: Asset;
  onResult: (data: StakeMoreResult) => void;
};

const InitOperation = ({ api, chainId, accounts, addressPrefix, asset, onResult }: Props) => {
  const { t } = useI18n();
  const activeWallet = useUnit(walletModel.$activeWallet);

  const [fee, setFee] = useState('');
  const [feeLoading, setFeeLoading] = useState(true);
  const [deposit, setDeposit] = useState('');
  const [amount, setAmount] = useState('');

  const [minBalance, setMinBalance] = useState('0');
  const [activeBalances, setActiveBalances] = useState<Balance[]>([]);

  const [activeStakeMoreAccounts, setActiveStakeMoreAccounts] = useState<Account[]>([]);
  const [activeSignatory, setActiveSignatory] = useState<Account>();

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const firstAccount = activeStakeMoreAccounts[0] || accounts[0];
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
    if (accounts.length === 0) return;

    setActiveStakeMoreAccounts(accounts);
  }, [accounts.length]);

  useEffect(() => {
    const balancesMap = new Map(balances.map((balance) => [balance.accountId, balance]));
    const newActiveBalances = activeStakeMoreAccounts
      .map((a) => balancesMap.get(a.accountId))
      .filter(nonNullable) as AccountBalance[];

    setActiveBalances(newActiveBalances);
  }, [activeStakeMoreAccounts.length, balances]);

  useEffect(() => {
    if (isMultisigWallet || activeBalances.length === 1) {
      setMinBalance(stakeableAmount(activeBalances[0]));

      return;
    }

    if (!activeBalances.length) {
      setMinBalance('0');
    } else {
      const stakeableBalance = activeBalances.map(stakeableAmount).filter((balance) => balance && balance !== '0');
      const minBalance = stakeableBalance.reduce<string>(
        (acc, balance) => (new BN(balance).lt(new BN(acc)) ? balance : acc),
        stakeableBalance[0],
      );

      setMinBalance(minBalance);
    }
  }, [activeBalances.length]);

  useEffect(() => {
    if (!minBalance) return;

    const newTransactions = activeStakeMoreAccounts.map(({ accountId }) => {
      return {
        chainId,
        type: TransactionType.STAKE_MORE,
        address: toAddress(accountId, { prefix: addressPrefix }),
        args: { maxAdditional: formatAmount(amount, asset.precision) },
      };
    });

    setTransactions(newTransactions);
  }, [minBalance, amount]);

  const getAccountDropdownOption = (account: Account) => {
    const balance = balances.find((b) => b.accountId === account.accountId);

    return getStakeAccountOption(account, { balance, asset, fee, addressPrefix, amount });
  };

  const getSignatoryDropdownOption = (wallet: Wallet, account: Account) => {
    const balance = signatoriesBalances.find((b) => b.accountId === account.accountId);

    return getSignatoryOption(wallet, account, { balance, asset, addressPrefix, fee, deposit });
  };

  const submitStakeMore = (data: { amount: string; description?: string }) => {
    const selectedAccountIds = activeStakeMoreAccounts.map((stake) => stake.accountId);
    const selectedAccounts = accounts.filter((account) => selectedAccountIds.includes(account.accountId));

    onResult({
      accounts: selectedAccounts,
      amount: formatAmount(data.amount, asset.precision),
      ...(isMultisigWallet && {
        description:
          data.description || t('transactionMessage.stakeMore', { amount: data.amount, asset: asset.symbol }),
        signer: activeSignatory,
      }),
    });
  };

  const validateBalance = (amount: string): boolean => {
    return activeBalances.every((b) => validateStake(b, amount, asset.precision));
  };

  const validateFee = (amount: string): boolean => {
    if (!isMultisigWallet) {
      return activeBalances.every((b) => validateStake(b, amount, asset.precision, fee));
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
    if (!isMultisigWallet) return activeStakeMoreAccounts.map((acc) => acc.accountId);

    return activeSignatory ? [activeSignatory.accountId] : [];
  };

  const canSubmit = !feeLoading && (activeStakeMoreAccounts.length > 0 || Boolean(activeSignatory));

  return (
    <div className="flex flex-col gap-y-4 w-[440px] px-5 py-4">
      <OperationForm
        chainId={chainId}
        accounts={getActiveAccounts()}
        canSubmit={canSubmit}
        addressPrefix={addressPrefix}
        fields={formFields}
        asset={asset}
        balanceRange={getBalanceRange()}
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
            onAccountChange={setActiveStakeMoreAccounts}
          />
        )}
        footer={
          <OperationFooter
            api={api}
            asset={asset}
            account={firstAccount}
            totalAccounts={activeStakeMoreAccounts.length}
            feeTx={transactions[0]}
            onFeeChange={setFee}
            onFeeLoading={setFeeLoading}
            onDepositChange={setDeposit}
          />
        }
        onSubmit={submitStakeMore}
        onAmountChange={setAmount}
      />
    </div>
  );
};

export default InitOperation;
