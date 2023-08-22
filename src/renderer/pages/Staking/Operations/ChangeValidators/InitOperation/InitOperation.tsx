import { ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';

import { useI18n } from '@renderer/app/providers';
import { Asset, Balance as AccountBalance, useBalance } from '@renderer/entities/asset';
import { ChainId, AccountId } from '@renderer/domain/shared-kernel';
import { getOperationErrors, Transaction, TransactionType } from '@renderer/entities/transaction';
import { Account, isMultisig, MultisigAccount } from '@renderer/entities/account';
import { useValidators } from '@renderer/entities/staking';
import { toAddress, nonNullable } from '@renderer/shared/lib/utils';
import { OperationForm } from '../../components';
import { getGeneralAccountOption, validateBalanceForFee, validateBalanceForFeeDeposit } from '../../common/utils';
import { OperationFooter, OperationHeader } from '@renderer/features/operation';
import { getSignatoryOption } from '@renderer/pages/Transfer/common/utils';

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
  const { getMaxValidators } = useValidators();
  const { getLiveAssetBalances } = useBalance();

  const [fee, setFee] = useState('');
  const [feeLoading, setFeeLoading] = useState(true);
  const [deposit, setDeposit] = useState('');

  const [activeValidatorsAccounts, setActiveValidatorsAccounts] = useState<(Account | MultisigAccount)[]>([]);

  const [activeSignatory, setActiveSignatory] = useState<Account>();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeBalances, setActiveBalances] = useState<AccountBalance[]>([]);

  const firstAccount = activeValidatorsAccounts[0] || accounts[0];
  const accountIsMultisig = isMultisig(firstAccount);
  const formFields = accountIsMultisig ? [{ name: 'description' }] : [];

  const accountIds = accounts.map((account) => account.accountId);
  const balances = getLiveAssetBalances(accountIds, chainId, asset.assetId.toString());

  const signatoryIds = accountIsMultisig ? firstAccount.signatories.map((s) => s.accountId) : [];
  const signatoriesBalances = getLiveAssetBalances(signatoryIds, chainId, asset.assetId.toString());
  const signerBalance = signatoriesBalances.find((b) => b.accountId === activeSignatory?.accountId);

  useEffect(() => {
    const balancesMap = new Map(balances.map((balance) => [balance.accountId, balance]));
    const newActiveBalances = activeValidatorsAccounts
      .map((a) => balancesMap.get(a.accountId))
      .filter(nonNullable) as AccountBalance[];

    setActiveBalances(newActiveBalances);
  }, [activeValidatorsAccounts.length, balances]);

  useEffect(() => {
    if (accountIsMultisig) {
      setActiveValidatorsAccounts(accounts);
    }
  }, [accountIsMultisig, firstAccount?.accountId]);

  useEffect(() => {
    const maxValidators = getMaxValidators(api);

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

  const getSignatoryDrowdownOption = (account: Account) => {
    const balance = signatoriesBalances.find((b) => b.accountId === account.accountId);

    return getSignatoryOption(account, { balance, asset, addressPrefix, fee, deposit });
  };

  const submitBond = (data: { amount: string; destination?: string; description?: string }) => {
    const selectedAccountIds = activeValidatorsAccounts.map((a) => a.accountId);
    const selectedAccounts = accounts.filter((account) => selectedAccountIds.includes(account.accountId));

    onResult({
      accounts: selectedAccounts,
      ...(accountIsMultisig && {
        description: data.description || t('transactionMessage.nominate'),
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
    if (!accountIsMultisig) return activeValidatorsAccounts.map((acc) => acc.accountId);

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
        footer={
          <OperationFooter
            api={api}
            asset={asset}
            account={firstAccount}
            totalAccounts={activeValidatorsAccounts.length}
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
            errors={errors}
            getAccountOption={getAccountDropdownOption}
            getSignatoryOption={getSignatoryDrowdownOption}
            onSignatoryChange={setActiveSignatory}
            onAccountChange={setActiveValidatorsAccounts}
          />
        }
        onSubmit={submitBond}
      />
    </div>
  );
};

export default InitOperation;
