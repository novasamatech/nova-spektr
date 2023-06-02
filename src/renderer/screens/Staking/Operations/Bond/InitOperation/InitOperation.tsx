import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { useEffect, useState } from 'react';

import { DropdownOption, DropdownResult } from '@renderer/components/ui-redesign/Dropdowns/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Balance as AccountBalance } from '@renderer/domain/balance';
import { Address, ChainId, AccountId } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { useAccount } from '@renderer/services/account/accountService';
import { useBalance } from '@renderer/services/balance/balanceService';
import { formatAmount, stakeableAmount } from '@renderer/shared/utils/balance';
import { useValidators } from '@renderer/services/staking/validatorsService';
import { Account, isMultisig, MultisigAccount } from '@renderer/domain/account';
import { toAddress } from '@renderer/shared/utils/address';
import { nonNullable } from '@renderer/shared/utils/functions';
import { Explorer } from '@renderer/domain/chain';
import { MultiSelect, Select, FootnoteText } from '@renderer/components/ui-redesign';
import { Deposit, Fee } from '@renderer/components/common';
import { OperationForm } from '../../components';
import {
  getStakeAccountOption,
  getSignatoryOptions,
  validateStake,
  validateBalanceForFee,
  validateBalanceForFeeDeposit,
} from '../../common/utils';
import { Icon } from '@renderer/components/ui';

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
  explorers?: Explorer[];
  accounts: Account[];
  asset: Asset;
  addressPrefix: number;
  onResult: (data: BondResult) => void;
};

const InitOperation = ({ api, chainId, explorers, accounts, asset, addressPrefix, onResult }: Props) => {
  const { t } = useI18n();
  const { getLiveBalance, getLiveAssetBalances } = useBalance();
  const { getLiveAccounts } = useAccount();
  const { getMaxValidators } = useValidators();

  const dbAccounts = getLiveAccounts();

  const [fee, setFee] = useState('');
  const [deposit, setDeposit] = useState('');
  const [amount, setAmount] = useState('');
  const [destination, setDestination] = useState('');

  const [activeBalances, setActiveBalances] = useState<AccountBalance[]>([]);

  const [stakeAccounts, setStakeAccounts] = useState<DropdownOption<Account | MultisigAccount>[]>([]);
  const [activeStakeAccounts, setActiveStakeAccounts] = useState<DropdownResult<Account | MultisigAccount>[]>([]);

  const [activeSignatory, setActiveSignatory] = useState<DropdownResult<Account>>();
  const [signatoryOptions, setSignatoryOptions] = useState<DropdownOption<Account>[]>([]);
  const [minBalance, setMinBalance] = useState<string>('0');
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const firstAccount = activeStakeAccounts[0]?.value;
  const accountIsMultisig = isMultisig(firstAccount);
  const formFields = accountIsMultisig
    ? [{ name: 'amount' }, { name: 'destination' }, { name: 'description' }]
    : [{ name: 'amount' }, { name: 'destination' }];

  const accountIds = accounts.map((account) => account.accountId);
  const signerBalance = getLiveBalance(activeSignatory?.value.accountId || '0x0', chainId, asset.assetId.toString());
  const balances = getLiveAssetBalances(accountIds, chainId, asset.assetId.toString());

  useEffect(() => {
    const balancesMap = new Map(balances.map((balance) => [balance.accountId, balance]));
    const newActiveBalances = activeStakeAccounts
      .map((a) => balancesMap.get(a.id as AccountId))
      .filter(nonNullable) as AccountBalance[];

    setActiveBalances(newActiveBalances);
  }, [activeStakeAccounts.length, balances]);

  useEffect(() => {
    if (!activeBalances.length) {
      setMinBalance('0');
    } else if (activeBalances.length === 1) {
      setMinBalance(stakeableAmount(activeBalances[0]));
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
    const formattedAccounts = accounts.map((account) => {
      const balance = balances.find((b) => b.accountId === account.accountId);

      return getStakeAccountOption(account, { asset, fee, amount, balance, addressPrefix });
    });

    if (formattedAccounts.length === 0) return;

    setStakeAccounts(formattedAccounts);
  }, [amount, fee, balances]);

  useEffect(() => {
    if (!accountIsMultisig) return;

    const signatories = firstAccount.signatories.map((s) => s.accountId);
    const signers = dbAccounts.filter((a) => signatories.includes(a.accountId));
    const options = getSignatoryOptions(signers, addressPrefix);

    if (options.length === 0) return;

    setSignatoryOptions(options);
    setActiveSignatory({ id: options[0].id, value: options[0].value });
  }, [firstAccount, accountIsMultisig, dbAccounts]);

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
          payee: destination ? { Account: destination } : 'Staked',
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
  }, [activeStakeAccounts.length, activeSignatory, amount, destination]);

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
    if (accountIsMultisig) {
      if (!signerBalance) return false;

      return validateBalanceForFee(signerBalance, fee);
    } else {
      const feeIsValid = activeBalances.every((b) => validateBalanceForFee(b, fee));
      const balanceIsValid = activeBalances.every((b) => validateStake(b, amount, asset.precision, fee));

      return feeIsValid && balanceIsValid;
    }
  };

  const validateDeposit = (): boolean => {
    if (!accountIsMultisig) return true;
    if (!signerBalance) return false;

    return validateBalanceForFeeDeposit(signerBalance, deposit, fee);
  };

  const balanceRange = activeBalances.length > 1 ? ['0', minBalance] : minBalance;

  return (
    <div className="flex flex-col gap-y-4">
      {stakeAccounts.length > 1 && (
        <MultiSelect
          label={t('staking.bond.accountLabel')}
          placeholder={t('staking.bond.accountPlaceholder')}
          multiPlaceholder={t('staking.bond.manyAccountsPlaceholder')}
          selectedIds={activeStakeAccounts.map((acc) => acc.id)}
          options={stakeAccounts}
          onChange={setActiveStakeAccounts}
        />
      )}

      {signatoryOptions.length > 1 && (
        <Select
          label={t('staking.bond.accountLabel')}
          placeholder={t('staking.bond.accountPlaceholder')}
          selectedId={activeSignatory?.id}
          options={signatoryOptions}
          onChange={setActiveSignatory}
        />
      )}

      <OperationForm
        chainId={chainId}
        canSubmit={activeStakeAccounts.length > 0}
        addressPrefix={addressPrefix}
        fields={formFields}
        asset={asset}
        balanceRange={balanceRange}
        validateBalance={validateBalance}
        validateFee={validateFee}
        validateDeposit={validateDeposit}
        onSubmit={submitBond}
        onFormChange={({ amount, destination = '' }) => {
          setAmount(amount);
          setDestination(destination);
        }}
      >
        <div className="grid grid-flow-row grid-cols-2 items-center gap-y-5">
          {accountIsMultisig && (
            <>
              <div className="flex gap-x-2">
                <Icon className="text-text-tertiary" name="lock" size={123} />
                <FootnoteText className="text-text-tertiary">{t('transfer.networkDeposit')}</FootnoteText>
              </div>
              <Deposit
                className="text-neutral justify-self-end text-2xs font-semibold"
                api={api}
                asset={asset}
                threshold={firstAccount.threshold}
                onDepositChange={setDeposit}
              />
            </>
          )}

          <FootnoteText className="text-text-tertiary">
            {t('staking.bond.networkFee', { count: activeStakeAccounts.length })}
          </FootnoteText>
          <Fee
            className="text-neutral justify-self-end text-2xs font-semibold"
            api={api}
            asset={asset}
            transaction={transactions[0]}
            onFeeChange={setFee}
          />
        </div>
      </OperationForm>
    </div>
  );
};

export default InitOperation;
