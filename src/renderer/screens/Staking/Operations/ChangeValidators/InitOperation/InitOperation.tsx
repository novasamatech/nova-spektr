import { ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';

import { DropdownOption, DropdownResult } from '@renderer/shared/ui/Dropdowns/common/types';
import { useI18n } from '@renderer/app/providers';
import { Asset } from '@renderer/domain/asset';
import { Balance as AccountBalance } from '@renderer/domain/balance';
import { ChainId, AccountId, SigningType } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { useAccount } from '@renderer/services/account/accountService';
import { useBalance } from '@renderer/services/balance/balanceService';
import { useValidators } from '@renderer/services/staking/validatorsService';
import { Account, isMultisig, MultisigAccount } from '@renderer/domain/account';
import { toAddress, nonNullable } from '@renderer/shared/lib/utils';
import { MultiSelect, Select, InputHint } from '@renderer/shared/ui';
import { OperationForm } from '../../components';
import {
  getSignatoryOptions,
  validateBalanceForFee,
  validateBalanceForFeeDeposit,
  getGeneralAccountOption,
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
  const { getLiveAccounts } = useAccount();
  const { getMaxValidators } = useValidators();
  const { getLiveAssetBalances } = useBalance();

  const dbAccounts = getLiveAccounts();

  const [fee, setFee] = useState('');
  const [feeLoading, setFeeLoading] = useState(true);
  const [deposit, setDeposit] = useState('');

  const [validatorsAccounts, setValidatorsAccounts] = useState<DropdownOption<Account | MultisigAccount>[]>([]);
  const [activeValidatorsAccounts, setActiveValidatorsAccounts] = useState<DropdownResult<Account | MultisigAccount>[]>(
    [],
  );

  const [activeSignatory, setActiveSignatory] = useState<DropdownResult<Account>>();
  const [signatoryOptions, setSignatoryOptions] = useState<DropdownOption<Account>[]>([]);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeBalances, setActiveBalances] = useState<AccountBalance[]>([]);

  const firstAccount = activeValidatorsAccounts[0]?.value;
  const accountIsMultisig = isMultisig(firstAccount);
  const formFields = accountIsMultisig ? [{ name: 'description' }] : [];

  const accountIds = accounts.map((account) => account.accountId);
  const balances = getLiveAssetBalances(accountIds, chainId, asset.assetId.toString());

  const signatoryIds = accountIsMultisig ? firstAccount.signatories.map((s) => s.accountId) : [];
  const signatoriesBalances = getLiveAssetBalances(signatoryIds, chainId, asset.assetId.toString());
  const signerBalance = signatoriesBalances.find((b) => b.accountId === activeSignatory?.value.accountId);

  useEffect(() => {
    const balancesMap = new Map(balances.map((balance) => [balance.accountId, balance]));
    const newActiveBalances = activeValidatorsAccounts
      .map((a) => balancesMap.get(a.id as AccountId))
      .filter(nonNullable) as AccountBalance[];

    setActiveBalances(newActiveBalances);
  }, [activeValidatorsAccounts.length, balances]);

  useEffect(() => {
    const formattedAccounts = accounts.map((account) => {
      const balance = balances.find((b) => b.accountId === account.accountId);

      return getGeneralAccountOption(account, { asset, fee, balance, addressPrefix });
    });

    if (formattedAccounts.length === 0) return;

    setValidatorsAccounts(formattedAccounts);
  }, [fee, balances, accounts.length]);

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
    setActiveSignatory({ id: signerOptions[0].id, value: signerOptions[0].value });
  }, [accountIsMultisig, dbAccounts.length, signatoriesBalances.length]);

  useEffect(() => {
    if (validatorsAccounts.length === 0) return;

    const activeAccounts = validatorsAccounts.map(({ id, value }) => ({ id, value }));
    setActiveValidatorsAccounts(activeAccounts);
  }, [validatorsAccounts.length]);

  useEffect(() => {
    const maxValidators = getMaxValidators(api);

    const bondPayload = activeValidatorsAccounts.map(({ id }) => {
      const address = toAddress(id, { prefix: addressPrefix });

      return {
        chainId,
        address,
        type: TransactionType.NOMINATE,
        args: { targets: Array(maxValidators).fill(address) },
      };
    });

    setTransactions(bondPayload);
  }, [activeValidatorsAccounts.length]);

  const submitBond = (data: { amount: string; destination?: string; description?: string }) => {
    const selectedAccountIds = activeValidatorsAccounts.map((a) => a.id);
    const selectedAccounts = accounts.filter((account) => selectedAccountIds.includes(account.accountId));

    onResult({
      accounts: selectedAccounts,
      ...(accountIsMultisig && {
        description: data.description || t('transactionMessage.nominate'),
        signer: activeSignatory?.value,
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
    if (!accountIsMultisig) return activeValidatorsAccounts.map((acc) => acc.id as AccountId);

    return activeSignatory ? [activeSignatory.id as AccountId] : [];
  };

  const isValidFee = validateFee();
  const isValidDeposit = validateDeposit();
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
          <OperationForm.Footer
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
        onSubmit={submitBond}
      >
        {accountIsMultisig ? (
          <div className="flex flex-col gap-y-2 mb-4">
            <Select
              label={t('staking.bond.signatoryLabel')}
              placeholder={t('staking.bond.signatoryPlaceholder')}
              disabled={!signatoryOptions.length}
              invalid={!isValidDeposit}
              selectedId={activeSignatory?.id}
              options={signatoryOptions}
              onChange={setActiveSignatory}
            />
            <InputHint active={!signatoryOptions.length}>{t('multisigOperations.noSignatory')}</InputHint>
            <InputHint active={!isValidDeposit} variant="error">
              {t('staking.notEnoughBalanceForDepositError')}
            </InputHint>
          </div>
        ) : (
          <div className="flex flex-col gap-y-2 mb-4">
            <MultiSelect
              label={t('staking.bond.accountLabel')}
              placeholder={t('staking.bond.accountPlaceholder')}
              multiPlaceholder={t('staking.bond.manyAccountsPlaceholder')}
              invalid={!isValidFee}
              selectedIds={activeValidatorsAccounts.map((acc) => acc.id)}
              options={validatorsAccounts}
              onChange={setActiveValidatorsAccounts}
            />
            <InputHint active={!isValidFee} variant="error">
              {t('staking.notEnoughBalanceForFeeError')}
            </InputHint>
          </div>
        )}
      </OperationForm>
    </div>
  );
};

export default InitOperation;
