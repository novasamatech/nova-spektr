import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { useEffect, useState } from 'react';

import { useI18n } from '@renderer/app/providers';
import { Asset, Balance, Balance as AccountBalance, useBalance } from '@renderer/entities/asset';
import { ChainId, AccountId } from '@renderer/domain/shared-kernel';
import { getOperationErrors, Transaction, TransactionType } from '@renderer/entities/transaction';
import { Account, isMultisig } from '@renderer/entities/account';
import { formatAmount, stakeableAmount, nonNullable, toAddress } from '@renderer/shared/lib/utils';
import { OperationForm } from '../../components';
import {
  getStakeAccountOption,
  validateBalanceForFee,
  validateStake,
  validateBalanceForFeeDeposit,
} from '../../common/utils';
import { getSignatoryOption } from '@renderer/pages/Transfer/common/utils';
import { OperationFooter, OperationHeader } from '@renderer/features/operation';

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
  const { getLiveAssetBalances } = useBalance();

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
  const accountIsMultisig = isMultisig(firstAccount);
  const formFields = accountIsMultisig ? [{ name: 'amount' }, { name: 'description' }] : [{ name: 'amount' }];

  const accountIds = accounts.map((account) => account.accountId);
  const balances = getLiveAssetBalances(accountIds, chainId, asset.assetId.toString());

  const signatoryIds = accountIsMultisig ? firstAccount.signatories.map((s) => s.accountId) : [];
  const signatoriesBalances = getLiveAssetBalances(signatoryIds, chainId, asset.assetId.toString());
  const signerBalance = signatoriesBalances.find((b) => b.accountId === activeSignatory?.accountId);

  useEffect(() => {
    const balancesMap = new Map(balances.map((balance) => [balance.accountId, balance]));
    const newActiveBalances = activeStakeMoreAccounts
      .map((a) => balancesMap.get(a.accountId))
      .filter(nonNullable) as AccountBalance[];

    setActiveBalances(newActiveBalances);
  }, [activeStakeMoreAccounts.length, balances]);

  useEffect(() => {
    if (accountIsMultisig || activeBalances.length === 1) {
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

  const getSignatoryDrowdownOption = (account: Account) => {
    const balance = signatoriesBalances.find((b) => b.accountId === account.accountId);

    return getSignatoryOption(account, { balance, asset, addressPrefix, fee, deposit });
  };

  const submitStakeMore = (data: { amount: string; description?: string }) => {
    const selectedAccountIds = activeStakeMoreAccounts.map((stake) => stake.accountId);
    const selectedAccounts = accounts.filter((account) => selectedAccountIds.includes(account.accountId));

    onResult({
      accounts: selectedAccounts,
      amount: formatAmount(data.amount, asset.precision),
      ...(accountIsMultisig && {
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
    if (!accountIsMultisig) {
      return activeBalances.every((b) => validateStake(b, amount, asset.precision, fee));
    }

    if (!signerBalance) return false;

    return validateBalanceForFee(signerBalance, fee);
  };

  const validateDeposit = (): boolean => {
    if (!accountIsMultisig) return true;
    if (!signerBalance) return false;

    return validateBalanceForFeeDeposit(signerBalance, deposit, fee);
  };

  const getBalanceRange = (): string | string[] => {
    if (activeSignatory) return minBalance;

    return activeBalances.length > 1 ? ['0', minBalance] : minBalance;
  };

  const getActiveAccounts = (): AccountId[] => {
    if (!accountIsMultisig) return activeStakeMoreAccounts.map((acc) => acc.accountId);

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
        footer={
          <OperationFooter
            api={api}
            asset={asset}
            account={firstAccount}
            totalAccounts={activeStakeMoreAccounts.length}
            transaction={transactions[0]}
            onFeeChange={setFee}
            onFeeLoading={setFeeLoading}
            onDepositChange={setDeposit}
          />
        }
        header={({ invalidBalance, invalidFee, invalidDeposit }) => (
          <OperationHeader
            chainId={chainId}
            accounts={accounts}
            isMultiselect
            errors={getOperationErrors(invalidFee, invalidDeposit, invalidBalance)}
            getSignatoryOption={getSignatoryDrowdownOption}
            getAccountOption={getAccountDropdownOption}
            onSignatoryChange={setActiveSignatory}
            onAccountChange={setActiveStakeMoreAccounts}
          />
        )}
        onSubmit={submitStakeMore}
        onAmountChange={setAmount}
      />
    </div>
  );
};

export default InitOperation;
