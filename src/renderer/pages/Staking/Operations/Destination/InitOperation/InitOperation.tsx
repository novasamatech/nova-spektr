import { ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';

import { useI18n } from '@renderer/app/providers';
import { Asset, useBalance, Balance as AccountBalance } from '@renderer/entities/asset';
import { Address, ChainId, AccountId } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/entities/transaction';
import { Account, isMultisig } from '@renderer/entities/account';
import { toAddress, nonNullable, TEST_ADDRESS } from '@renderer/shared/lib/utils';
import { OperationForm } from '../../components';
import { validateBalanceForFeeDeposit, validateBalanceForFee, getGeneralAccountOption } from '../../common/utils';
import { OperationFooter, OperationHeader } from '@renderer/features/InitOperation';
import { getSignatoryOption } from '@renderer/pages/Transfer/common/utils';

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
  const { getLiveAssetBalances } = useBalance();

  const [fee, setFee] = useState('');
  const [feeLoading, setFeeLoading] = useState(true);
  const [deposit, setDeposit] = useState('');

  const [activeDestAccounts, setActiveDestAccounts] = useState<Account[]>([]);
  const [activeSignatory, setActiveSignatory] = useState<Account>();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeBalances, setActiveBalances] = useState<AccountBalance[]>([]);

  const firstAccount = activeDestAccounts[0];
  const accountIsMultisig = isMultisig(firstAccount);
  const formFields = accountIsMultisig ? [{ name: 'destination' }, { name: 'description' }] : [{ name: 'destination' }];

  const accountIds = accounts.map((account) => account.accountId);
  const balances = getLiveAssetBalances(accountIds, chainId, asset.assetId.toString());

  const signatoryIds = accountIsMultisig ? firstAccount.signatories.map((s) => s.accountId) : [];
  const signatoriesBalances = getLiveAssetBalances(signatoryIds, chainId, asset.assetId.toString());
  const signerBalance = signatoriesBalances.find((b) => b.accountId === activeSignatory?.accountId);

  useEffect(() => {
    const balancesMap = new Map(balances.map((balance) => [balance.accountId, balance]));
    const newActiveBalances = activeDestAccounts
      .map((a) => balancesMap.get(a.accountId))
      .filter(nonNullable) as AccountBalance[];

    setActiveBalances(newActiveBalances);
  }, [activeDestAccounts.length, balances]);

  useEffect(() => {
    if (accountIsMultisig) {
      setActiveDestAccounts(accounts);
    }
  }, [accountIsMultisig, firstAccount?.accountId]);

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

  const getSignatoryDrowdownOption = (account: Account) => {
    const balance = balances.find((b) => b.accountId === account.accountId);

    return getSignatoryOption(account, { balance, asset, addressPrefix, fee, deposit });
  };

  const submitDestination = (data: { destination?: string; description?: string }) => {
    const selectedAccountIds = activeDestAccounts.map((stake) => stake.accountId);
    const selectedAccounts = accounts.filter((account) => selectedAccountIds.includes(account.accountId));

    onResult({
      accounts: selectedAccounts,
      destination: data.destination || '',
      ...(accountIsMultisig && {
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

  const getActiveAccounts = (): AccountId[] => {
    if (!accountIsMultisig) return activeDestAccounts.map((acc) => acc.accountId);

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
        footer={
          <OperationFooter
            api={api}
            asset={asset}
            account={firstAccount}
            totalAccounts={activeDestAccounts.length}
            transaction={transactions[0]}
            onFeeChange={setFee}
            onFeeLoading={setFeeLoading}
            onDepositChange={setDeposit}
          />
        }
        header={
          <OperationHeader
            chainId={chainId}
            accounts={accounts}
            isMultiselect
            invalid={accountIsMultisig ? !isValidDeposit : !isValidFee}
            error={
              (!isValidDeposit && t('staking.notEnoughBalanceForDepositError')) ||
              (!isValidFee && t('staking.notEnoughBalanceForFeeError')) ||
              ''
            }
            getAccountOption={getAccountDropdownOption}
            getSignatoryOption={getSignatoryDrowdownOption}
            onSignatoryChange={setActiveSignatory}
            onAccountChange={setActiveDestAccounts}
          />
        }
        onSubmit={submitDestination}
      />
    </div>
  );
};

export default InitOperation;
