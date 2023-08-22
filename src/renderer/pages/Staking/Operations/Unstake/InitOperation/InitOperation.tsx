import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { useEffect, useState } from 'react';

import { useI18n } from '@renderer/app/providers';
import { Asset, useBalance, Balance as AccountBalance } from '@renderer/entities/asset';
import { ChainId, AccountId } from '@renderer/domain/shared-kernel';
import { getOperationErrors, Transaction, TransactionType } from '@renderer/entities/transaction';
import { isMultisig, Account } from '@renderer/entities/account';
import { formatAmount, nonNullable, toAddress } from '@renderer/shared/lib/utils';
import { StakingMap, useStakingData } from '@renderer/entities/staking';
import { OperationForm } from '@renderer/pages/Staking/Operations/components';
import {
  getUnstakeAccountOption,
  validateBalanceForFee,
  validateUnstake,
  validateBalanceForFeeDeposit,
} from '../../common/utils';
import { getSignatoryOption } from '@renderer/pages/Transfer/common/utils';
import { OperationFooter, OperationHeader } from '@renderer/features/operation';

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
  const { subscribeStaking, getMinNominatorBond } = useStakingData();
  const { getLiveAssetBalances } = useBalance();

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
  const accountIsMultisig = isMultisig(firstAccount);
  const formFields = accountIsMultisig ? [{ name: 'amount' }, { name: 'description' }] : [{ name: 'amount' }];

  const accountIds = accounts.map((account) => account.accountId);
  const balances = getLiveAssetBalances(accountIds, chainId, asset.assetId.toString());

  const signatoryIds = accountIsMultisig ? firstAccount.signatories.map((s) => s.accountId) : [];
  const signatoriesBalances = getLiveAssetBalances(signatoryIds, chainId, asset.assetId.toString());
  const signerBalance = signatoriesBalances.find((b) => b.accountId === activeSignatory?.accountId);

  useEffect(() => {
    getMinNominatorBond(api).then(setMinimumStake);
  }, [api]);

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

  const getSignatoryDrowdownOption = (account: Account) => {
    const balance = signatoriesBalances.find((b) => b.accountId === account.accountId);

    return getSignatoryOption(account, { balance, asset, addressPrefix, fee, deposit });
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
      ...(accountIsMultisig && {
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
    if (!accountIsMultisig) {
      return activeBalances.every((b) => validateBalanceForFee(b, fee));
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
    if (!accountIsMultisig) return activeUnstakeAccounts.map((acc) => acc.accountId);

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
        footer={
          <OperationFooter
            api={api}
            asset={asset}
            account={firstAccount}
            totalAccounts={activeUnstakeAccounts.length}
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
            onAccountChange={setActiveUnstakeAccounts}
          />
        )}
        onSubmit={submitUnstake}
        onAmountChange={setAmount}
      />
    </div>
  );
};

export default InitOperation;
