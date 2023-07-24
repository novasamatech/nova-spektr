import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { useEffect, useState } from 'react';

import { DropdownOption, DropdownResult } from '@renderer/shared/ui/Dropdowns/common/types';
import { useI18n } from '@renderer/app/providers';
import { Asset } from '@renderer/domain/asset';
import { Balance as AccountBalance } from '@renderer/domain/balance';
import { AccountId, Address, ChainId, SigningType } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { useAccount } from '@renderer/services/account/accountService';
import { useBalance } from '@renderer/services/balance/balanceService';
import { formatAmount, stakeableAmount, toAddress, nonNullable, TEST_ADDRESS } from '@renderer/shared/lib/utils';
import { useValidators } from '@renderer/services/staking/validatorsService';
import { Account, isMultisig, MultisigAccount } from '@renderer/domain/account';
import { InputHint, MultiSelect, Select } from '@renderer/shared/ui';
import { OperationForm } from '../../components';
import {
  getSignatoryOptions,
  getStakeAccountOption,
  validateBalanceForFee,
  validateBalanceForFeeDeposit,
  validateStake,
} from '../../common/utils';

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
  const { getLiveAccounts } = useAccount();
  const { getMaxValidators } = useValidators();
  const { getLiveAssetBalances } = useBalance();

  const dbAccounts = getLiveAccounts();

  const [fee, setFee] = useState('');
  const [feeLoading, setFeeLoading] = useState(true);
  const [deposit, setDeposit] = useState('');
  const [amount, setAmount] = useState('');

  const [minBalance, setMinBalance] = useState('0');

  const [stakeAccounts, setStakeAccounts] = useState<DropdownOption<Account | MultisigAccount>[]>([]);
  const [activeStakeAccounts, setActiveStakeAccounts] = useState<DropdownResult<Account | MultisigAccount>[]>([]);

  const [activeSignatory, setActiveSignatory] = useState<DropdownResult<Account>>();
  const [signatoryOptions, setSignatoryOptions] = useState<DropdownOption<Account>[]>([]);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeBalances, setActiveBalances] = useState<AccountBalance[]>([]);

  const firstAccount = activeStakeAccounts[0]?.value;
  const accountIsMultisig = isMultisig(firstAccount);
  const formFields = accountIsMultisig
    ? [{ name: 'amount' }, { name: 'destination' }, { name: 'description' }]
    : [{ name: 'amount' }, { name: 'destination' }];

  const accountIds = accounts.map((account) => account.accountId);
  const balances = getLiveAssetBalances(accountIds, chainId, asset.assetId.toString());

  const signatoryIds = accountIsMultisig ? firstAccount.signatories.map((s) => s.accountId) : [];
  const signatoriesBalances = getLiveAssetBalances(signatoryIds, chainId, asset.assetId.toString());
  const signerBalance = signatoriesBalances.find((b) => b.accountId === activeSignatory?.value.accountId);

  useEffect(() => {
    const balancesMap = new Map(balances.map((balance) => [balance.accountId, balance]));
    const newActiveBalances = activeStakeAccounts
      .map((a) => balancesMap.get(a.id as AccountId))
      .filter(nonNullable) as AccountBalance[];

    setActiveBalances(newActiveBalances);
  }, [activeStakeAccounts.length, balances]);

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
    const formattedAccounts = accounts.map((account) => {
      const balance = balances.find((b) => b.accountId === account.accountId);

      return getStakeAccountOption(account, { asset, fee, amount, balance, addressPrefix });
    });

    if (formattedAccounts.length === 0) return;

    setStakeAccounts(formattedAccounts);
  }, [amount, fee, balances, accounts.length]);

  useEffect(() => {
    if (!accountIsMultisig) return;

    const signerOptions = dbAccounts.reduce<DropdownOption<Account>[]>((acc, signer) => {
      const isWatchOnly = signer.signingType === SigningType.WATCH_ONLY;
      const signerExist = signatoryIds.includes(signer.accountId);
      if (!isWatchOnly && signerExist) {
        const balance = signatoriesBalances.find((b) => b.accountId === signer.accountId);

        acc.push(getSignatoryOptions(signer, { addressPrefix, asset, balance }));
      }

      return acc;
    }, []);

    if (signerOptions.length === 0) return;

    setSignatoryOptions(signerOptions);
    !activeSignatory && setActiveSignatory({ id: signerOptions[0].id, value: signerOptions[0].value });
  }, [accountIsMultisig, dbAccounts.length, signatoriesBalances]);

  useEffect(() => {
    if (stakeAccounts.length === 0) return;

    const activeAccounts = stakeAccounts.map(({ id, value }) => ({ id, value }));
    setActiveStakeAccounts(activeAccounts);
  }, [stakeAccounts.length]);

  useEffect(() => {
    const maxValidators = getMaxValidators(api);

    const bondPayload = activeStakeAccounts.map(({ id }) => {
      const address = toAddress(id, { prefix: addressPrefix });
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
    const selectedAccountIds = activeStakeAccounts.map((a) => a.id);
    const selectedAccounts = accounts.filter((account) => selectedAccountIds.includes(account.accountId));

    onResult({
      accounts: selectedAccounts,
      amount: formatAmount(data.amount, asset.precision),
      destination: data.destination || '',
      ...(accountIsMultisig && {
        description: data.description || t('transactionMessage.bond', { amount: data.amount, asset: asset.symbol }),
        signer: activeSignatory?.value,
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
    if (!accountIsMultisig) return activeStakeAccounts.map((acc) => acc.id as AccountId);

    return activeSignatory ? [activeSignatory.id as AccountId] : [];
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
          <OperationForm.Footer
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
        onSubmit={submitBond}
        onAmountChange={setAmount}
      >
        {({ invalidBalance, invalidFee, invalidDeposit }) =>
          accountIsMultisig ? (
            <div className="flex flex-col gap-y-2 mb-4">
              <Select
                label={t('staking.bond.signatoryLabel')}
                placeholder={t('staking.bond.signatoryPlaceholder')}
                disabled={!signatoryOptions.length}
                invalid={invalidDeposit || invalidFee}
                selectedId={activeSignatory?.id}
                options={signatoryOptions}
                onChange={setActiveSignatory}
              />
              <InputHint active={!signatoryOptions.length}>{t('multisigOperations.noSignatory')}</InputHint>
            </div>
          ) : (
            <MultiSelect
              className="mb-4"
              label={t('staking.bond.accountLabel')}
              placeholder={t('staking.bond.accountPlaceholder')}
              multiPlaceholder={t('staking.bond.manyAccountsPlaceholder')}
              invalid={invalidBalance || invalidFee}
              selectedIds={activeStakeAccounts.map((acc) => acc.id)}
              options={stakeAccounts}
              onChange={setActiveStakeAccounts}
            />
          )
        }
      </OperationForm>
    </div>
  );
};

export default InitOperation;
