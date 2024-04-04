import { useEffect, useState } from 'react';

import type { Account, MultisigAccount } from '@shared/core';
import { InputHint, MultiSelect } from '@shared/ui';
import { useI18n } from '@app/providers';
import { DropdownOption, DropdownResult } from '@shared/ui/types';
import { OperationErrorType } from '@entities/transaction';

type Props = {
  accounts: Account[];
  invalid?: boolean;
  error?: OperationErrorType;
  getAccountOption: (account: Account) => DropdownOption<Account>;
  onAccountsChange: (accounts: Account[]) => void;
};

export const SingleSelectMultishardHeader = ({
  accounts,
  invalid,
  error,
  getAccountOption,
  onAccountsChange,
}: Props) => {
  const { t } = useI18n();

  const [activeAccounts, setActiveAccounts] = useState<DropdownResult<Account | MultisigAccount>[]>([]);
  const [accountsOptions, setAccountsOptions] = useState<DropdownOption<Account>[]>([]);

  useEffect(() => {
    const formattedAccounts = accounts.map((account) => getAccountOption(account));

    if (formattedAccounts.length === 0) return;

    setAccountsOptions(formattedAccounts);
  }, [accounts.length, getAccountOption]);

  useEffect(() => {
    if (accountsOptions.length === 0) return;

    const activeAccounts = accountsOptions.map(({ id, value }) => ({ id, value }));
    changeAccount(activeAccounts);
  }, [accountsOptions.length]);

  const changeAccount = (accounts: DropdownResult<Account>[]) => {
    onAccountsChange(accounts.map((a) => a.value));
    setActiveAccounts(accounts);
  };

  return (
    <div className="flex flex-col gap-y-2 mb-4">
      <MultiSelect
        className="mb-4"
        label={t('staking.bond.accountLabel')}
        placeholder={t('staking.bond.accountPlaceholder')}
        multiPlaceholder={t('staking.bond.manyAccountsPlaceholder')}
        invalid={invalid}
        selectedIds={activeAccounts.map((acc) => acc.id)}
        options={accountsOptions}
        onChange={changeAccount}
      />
      <InputHint active={Boolean(error)} variant="error">
        {t(error || '')}
      </InputHint>
    </div>
  );
};
