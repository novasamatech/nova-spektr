import { ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';
import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { getOperationErrors, Transaction, TransactionType } from '@entities/transaction';
import type { Asset, Account, Balance as AccountBalance, Address, ChainId, AccountId, Wallet } from '@shared/core';
import { toAddress, nonNullable, TEST_ADDRESS } from '@shared/lib/utils';
import { OperationFooter, OperationHeader } from '@features/operation';
import { OperationForm } from '../../components';
import {
  validateBalanceForFeeDeposit,
  validateBalanceForFee,
  getGeneralAccountOption,
  getSignatoryOption,
} from '../../common/utils';
import { walletModel, accountUtils, walletUtils } from '@entities/wallet';
import { useAssetBalances } from '@entities/balance';

export type DestinationResult = {
  accounts: Account[];
  destination: Address;
  signer?: Account;
  description?: string;
};

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  accounts: Account[];
  addressPrefix: number;
  asset: Asset;
  onResult: (data: DestinationResult) => void;
};

const InitOperation = ({ api, chainId, accounts, addressPrefix, asset, onResult }: Props) => {
  const { t } = useI18n();
  const activeWallet = useUnit(walletModel.$activeWallet);

  const [fee, setFee] = useState('');
  const [feeLoading, setFeeLoading] = useState(true);
  const [deposit, setDeposit] = useState('');

  const [activeDestAccounts, setActiveDestAccounts] = useState<Account[]>([]);
  const [activeSignatory, setActiveSignatory] = useState<Account>();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeBalances, setActiveBalances] = useState<AccountBalance[]>([]);

  const firstAccount = activeDestAccounts[0] || accounts[0];
  const isMultisigWallet = walletUtils.isMultisig(activeWallet);
  const isMultisigAccount = firstAccount && accountUtils.isMultisigAccount(firstAccount);
  const formFields = isMultisigWallet ? [{ name: 'destination' }, { name: 'description' }] : [{ name: 'destination' }];

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

    setActiveDestAccounts(accounts);
  }, [accounts.length]);

  useEffect(() => {
    const balancesMap = new Map(balances.map((balance) => [balance.accountId, balance]));
    const newActiveBalances = activeDestAccounts
      .map((a) => balancesMap.get(a.accountId))
      .filter(nonNullable) as AccountBalance[];

    setActiveBalances(newActiveBalances);
  }, [activeDestAccounts.length, balances]);

  useEffect(() => {
    if (isMultisigWallet) {
      setActiveDestAccounts(accounts);
    }
  }, [isMultisigWallet, firstAccount?.accountId]);

  useEffect(() => {
    const newTransactions = activeDestAccounts.map((value) => ({
      chainId,
      address: toAddress(value.accountId, { prefix: addressPrefix }),
      type: TransactionType.DESTINATION,
      args: { payee: { Account: TEST_ADDRESS } },
    }));

    setTransactions(newTransactions);
  }, [activeDestAccounts.length]);

  const getAccountDropdownOption = (account: Account) => {
    const balance = balances.find((b) => b.accountId === account.accountId);

    return getGeneralAccountOption(account, { asset, fee, balance, addressPrefix });
  };

  const getSignatoryDropdownOption = (wallet: Wallet, account: Account) => {
    const balance = signatoriesBalances.find((b) => b.accountId === account.accountId);

    return getSignatoryOption(wallet, account, { balance, asset, addressPrefix, fee, deposit });
  };

  const submitDestination = (data: { destination?: string; description?: string }) => {
    const selectedAccountIds = activeDestAccounts.map((stake) => stake.accountId);
    const selectedAccounts = accounts.filter((account) => selectedAccountIds.includes(account.accountId));

    onResult({
      accounts: selectedAccounts,
      destination: data.destination || '',
      ...(isMultisigWallet && {
        description:
          data.description ||
          t('transactionMessage.destination', {
            address: data.destination || t('transactionMessage.restakeDestination'),
          }),
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
    if (!isMultisigWallet) return activeDestAccounts.map((acc) => acc.accountId);

    return activeSignatory ? [activeSignatory.accountId] : [];
  };

  const isValidFee = validateFee();
  const isValidDeposit = validateDeposit();
  const canSubmit =
    !feeLoading && (activeDestAccounts.length > 0 || Boolean(activeSignatory)) && isValidFee && isValidDeposit;

  return (
    <div className="flex flex-col gap-y-4 w-[440px] px-5 py-4">
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
            errors={getOperationErrors(!isValidFee, !isValidDeposit)}
            getAccountOption={getAccountDropdownOption}
            getSignatoryOption={getSignatoryDropdownOption}
            onSignatoryChange={setActiveSignatory}
            onAccountChange={setActiveDestAccounts}
          />
        }
        footer={
          <OperationFooter
            api={api}
            asset={asset}
            account={firstAccount}
            totalAccounts={activeDestAccounts.length}
            feeTx={transactions[0]}
            onFeeChange={setFee}
            onFeeLoading={setFeeLoading}
            onDepositChange={setDeposit}
          />
        }
        onSubmit={submitDestination}
      />
    </div>
  );
};

export default InitOperation;
