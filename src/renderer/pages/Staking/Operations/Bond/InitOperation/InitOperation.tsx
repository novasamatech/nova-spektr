import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { useEffect, useState } from 'react';

import { OperationFooter, OperationHeader } from '@renderer/features/init-operation';
import { useI18n } from '@renderer/app/providers';
import { Asset, Balance as AccountBalance, useBalance } from '@renderer/entities/asset';
import { AccountId, Address, ChainId } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/entities/transaction';
import { Account, isMultisig, MultisigAccount } from '@renderer/entities/account';
import { formatAmount, stakeableAmount, toAddress, nonNullable, TEST_ADDRESS } from '@renderer/shared/lib/utils';
import { useValidators } from '@renderer/entities/staking';
import { OperationForm } from '../../components';
import {
  getStakeAccountOption,
  validateBalanceForFee,
  validateBalanceForFeeDeposit,
  validateStake,
} from '../../common/utils';
import { getSignatoryOption } from '@renderer/pages/Transfer/common/utils';

export type BondResult = {
  amount: string;
  accounts: Account[];
  destination: Address;
  signer?: Account;
  description?: string;
};

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  accounts: Account[];
  asset: Asset;
  addressPrefix: number;
  onResult: (data: BondResult) => void;
};

const InitOperation = ({ api, chainId, accounts, asset, addressPrefix, onResult }: Props) => {
  const { t } = useI18n();
  const { getMaxValidators } = useValidators();
  const { getLiveAssetBalances } = useBalance();

  const [fee, setFee] = useState('');
  const [feeLoading, setFeeLoading] = useState(true);
  const [deposit, setDeposit] = useState('');
  const [amount, setAmount] = useState('');

  const [minBalance, setMinBalance] = useState('0');

  const [activeStakeAccounts, setActiveStakeAccounts] = useState<(Account | MultisigAccount)[]>([]);

  const [activeSignatory, setActiveSignatory] = useState<Account>();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeBalances, setActiveBalances] = useState<AccountBalance[]>([]);

  const firstAccount = activeStakeAccounts[0];
  const accountIsMultisig = isMultisig(firstAccount);
  const formFields = accountIsMultisig
    ? [{ name: 'amount' }, { name: 'destination' }, { name: 'description' }]
    : [{ name: 'amount' }, { name: 'destination' }];

  const accountIds = accounts.map((account) => account.accountId);
  const balances = getLiveAssetBalances(accountIds, chainId, asset.assetId.toString());

  const signatoryIds = accountIsMultisig ? firstAccount.signatories.map((s) => s.accountId) : [];
  const signatoriesBalances = getLiveAssetBalances(signatoryIds, chainId, asset.assetId.toString());
  const signerBalance = signatoriesBalances.find((b) => b.accountId === activeSignatory?.accountId);

  useEffect(() => {
    const balancesMap = new Map(balances.map((balance) => [balance.accountId, balance]));
    const newActiveBalances = activeStakeAccounts
      .map((a) => balancesMap.get(a.accountId))
      .filter(nonNullable) as AccountBalance[];

    setActiveBalances(newActiveBalances);
  }, [activeStakeAccounts.length, balances]);

  const getAccountDropdownOption = (account: Account) => {
    const balance = balances.find((b) => b.accountId === account.accountId);

    return getStakeAccountOption(account, { asset, fee, amount, balance, addressPrefix });
  };

  const getSignatoryDrowdownOption = (account: Account) => {
    const balance = balances.find((b) => b.accountId === account.accountId);

    return getSignatoryOption(account, { balance, asset, addressPrefix, fee, deposit });
  };

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
  }, [activeBalances.length, activeSignatory, signerBalance]);

  useEffect(() => {
    if (accountIsMultisig) {
      setActiveStakeAccounts(accounts);
    }
  }, [accountIsMultisig, firstAccount?.accountId]);

  useEffect(() => {
    const maxValidators = getMaxValidators(api);

    const bondPayload = activeStakeAccounts.map(({ accountId }) => {
      const address = toAddress(accountId, { prefix: addressPrefix });
      const commonPayload = { chainId, address };

      const bondTx = {
        ...commonPayload,
        type: TransactionType.BOND,
        args: {
          value: formatAmount(amount, asset.precision),
          controller: address,
          payee: { Account: TEST_ADDRESS },
        },
      };

      const nominateTx = {
        ...commonPayload,
        type: TransactionType.NOMINATE,
        args: { targets: Array(maxValidators).fill(address) },
      };

      return {
        ...commonPayload,
        type: TransactionType.BATCH_ALL,
        args: { transactions: [bondTx, nominateTx] },
      };
    });

    setTransactions(bondPayload);
  }, [activeStakeAccounts.length, amount]);

  const submitBond = (data: { amount: string; destination?: string; description?: string }) => {
    const selectedAccountIds = activeStakeAccounts.map((a) => a.accountId);
    const selectedAccounts = accounts.filter((account) => selectedAccountIds.includes(account.accountId));

    onResult({
      accounts: selectedAccounts,
      amount: formatAmount(data.amount, asset.precision),
      destination: data.destination || '',
      ...(accountIsMultisig && {
        description: data.description || t('transactionMessage.bond', { amount: data.amount, asset: asset.symbol }),
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

  const canSubmit = !feeLoading && (activeStakeAccounts.length > 0 || Boolean(activeSignatory));

  const getActiveAccounts = (): AccountId[] => {
    if (!accountIsMultisig) return activeStakeAccounts.map((acc) => acc.accountId as AccountId);

    return activeSignatory ? [activeSignatory.accountId] : [];
  };

  return (
    <div className="flex flex-col w-[440px] px-5 py-4">
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
            totalAccounts={activeStakeAccounts.length}
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
            invalid={accountIsMultisig ? invalidDeposit || invalidFee : invalidBalance || invalidFee}
            getSignatoryOption={getSignatoryDrowdownOption}
            getAccountOption={getAccountDropdownOption}
            onSignatoryChange={setActiveSignatory}
            onAccountChange={setActiveStakeAccounts}
          />
        )}
        onSubmit={submitBond}
        onAmountChange={setAmount}
      />
    </div>
  );
};

export default InitOperation;
