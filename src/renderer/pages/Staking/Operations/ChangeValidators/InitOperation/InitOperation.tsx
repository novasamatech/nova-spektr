import { ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';
import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { getOperationErrors, Transaction, TransactionType } from '@entities/transaction';
import { validatorsService } from '@entities/staking';
import { toAddress, nonNullable } from '@shared/lib/utils';
import { OperationFooter, OperationHeader } from '@features/operations';
import { OperationForm } from '../../components';
import { Balance as AccountBalance, Account, Asset, MultisigAccount, ChainId, AccountId, Wallet } from '@shared/core';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import { useAssetBalances } from '@entities/balance';
import {
  getSignatoryOption,
  getGeneralAccountOption,
  validateBalanceForFee,
  validateBalanceForFeeDeposit,
} from '../../common/utils';

export type ValidatorsResult = {
  accounts: Account[];
  signer?: Account;
  description?: string;
};

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  accounts: Account[];
  asset: Asset;
  addressPrefix: number;
  onResult: (data: ValidatorsResult) => void;
};

const InitOperation = ({ api, chainId, accounts, asset, addressPrefix, onResult }: Props) => {
  const { t } = useI18n();
  const activeWallet = useUnit(walletModel.$activeWallet);

  const [fee, setFee] = useState('');
  const [feeLoading, setFeeLoading] = useState(true);
  const [deposit, setDeposit] = useState('');

  const [activeValidatorsAccounts, setActiveValidatorsAccounts] = useState<(Account | MultisigAccount)[]>([]);

  const [activeSignatory, setActiveSignatory] = useState<Account>();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeBalances, setActiveBalances] = useState<AccountBalance[]>([]);

  const firstAccount = activeValidatorsAccounts[0] || accounts[0];
  const isMultisigWallet = walletUtils.isMultisig(activeWallet);
  const isMultisigAccount = firstAccount && accountUtils.isMultisigAccount(firstAccount);
  const formFields = isMultisigWallet ? [{ name: 'description' }] : [];

  const accountIds = accounts.map((account) => account.accountId);
  const balances = useAssetBalances({
    chainId,
    accountIds,
    assetId: asset.assetId.toString(),
  });

  const signatoryIds = isMultisigAccount ? firstAccount.signatories.map((s) => s.accountId) : [];
  const signatoriesBalances = useAssetBalances({
    chainId,
    accountIds: signatoryIds,
    assetId: asset.assetId.toString(),
  });
  const signerBalance = signatoriesBalances.find((b) => b.accountId === activeSignatory?.accountId);

  useEffect(() => {
    if (accounts.length === 0) return;

    setActiveValidatorsAccounts(accounts);
  }, [accounts.length]);

  useEffect(() => {
    const balancesMap = new Map(balances.map((balance) => [balance.accountId, balance]));
    const newActiveBalances = activeValidatorsAccounts
      .map((a) => balancesMap.get(a.accountId))
      .filter(nonNullable) as AccountBalance[];

    setActiveBalances(newActiveBalances);
  }, [activeValidatorsAccounts.length, balances]);

  useEffect(() => {
    if (isMultisigWallet) {
      setActiveValidatorsAccounts(accounts);
    }
  }, [isMultisigWallet, firstAccount?.accountId]);

  useEffect(() => {
    const maxValidators = validatorsService.getMaxValidators(api);

    const bondPayload = activeValidatorsAccounts.map(({ accountId }) => {
      const address = toAddress(accountId, { prefix: addressPrefix });

      return {
        chainId,
        address,
        type: TransactionType.NOMINATE,
        args: { targets: Array(maxValidators).fill(address) },
      };
    });

    setTransactions(bondPayload);
  }, [activeValidatorsAccounts.length]);

  const getAccountDropdownOption = (account: Account) => {
    const balance = balances.find((b) => b.accountId === account.accountId);

    return getGeneralAccountOption(account, { asset, fee, balance, addressPrefix });
  };

  const getSignatoryDropdownOption = (wallet: Wallet, account: Account) => {
    const balance = signatoriesBalances.find((b) => b.accountId === account.accountId);

    return getSignatoryOption(wallet, account, { balance, asset, addressPrefix, fee, deposit });
  };

  const submitBond = (data: { amount: string; destination?: string; description?: string }) => {
    const selectedAccountIds = activeValidatorsAccounts.map((a) => a.accountId);
    const selectedAccounts = accounts.filter((account) => selectedAccountIds.includes(account.accountId));

    onResult({
      accounts: selectedAccounts,
      ...(isMultisigWallet && {
        description: data.description || t('transactionMessage.nominate'),
        signer: activeSignatory,
      }),
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

  const getActiveAccounts = (): AccountId[] => {
    if (!isMultisigWallet) return activeValidatorsAccounts.map((acc) => acc.accountId);

    return activeSignatory ? [activeSignatory.accountId] : [];
  };

  const isValidFee = validateFee();
  const isValidDeposit = validateDeposit();
  const errors = getOperationErrors(!isValidFee, !isValidDeposit);
  const canSubmit =
    !feeLoading && (activeValidatorsAccounts.length > 0 || Boolean(activeSignatory)) && isValidFee && isValidDeposit;

  return (
    <div className="flex flex-col w-[440px] px-5 py-4">
      <OperationForm
        chainId={chainId}
        accounts={getActiveAccounts()}
        canSubmit={canSubmit}
        addressPrefix={addressPrefix}
        fields={formFields}
        asset={asset}
        header={
          <OperationHeader
            chainId={chainId}
            accounts={accounts}
            isMultiselect
            errors={errors}
            getAccountOption={getAccountDropdownOption}
            getSignatoryOption={getSignatoryDropdownOption}
            onSignatoryChange={setActiveSignatory}
            onAccountChange={setActiveValidatorsAccounts}
          />
        }
        footer={
          <OperationFooter
            api={api}
            asset={asset}
            account={firstAccount}
            totalAccounts={activeValidatorsAccounts.length}
            feeTx={transactions[0]}
            onFeeChange={setFee}
            onFeeLoading={setFeeLoading}
            onDepositChange={setDeposit}
          />
        }
        onSubmit={submitBond}
      />
    </div>
  );
};

export default InitOperation;
