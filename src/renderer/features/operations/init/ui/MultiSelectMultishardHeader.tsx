import { useEffect, useState } from 'react';

import { InputHint, Select } from '@shared/ui';
import { useI18n } from '@app/providers';
import { DropdownOption, DropdownResult } from '@shared/ui/types';
import { OperationErrorType } from '@entities/transaction';
import { accountUtils } from '@entities/wallet';
import type { Account, MultisigAccount, ChainId } from '@shared/core';

type Props = {
  accounts: Account_NEW[];
  chainId: ChainId;
  invalid?: boolean;
  error?: OperationErrorType;
  getAccountOption: (account: Account) => DropdownOption<Account>;
  onAccountChange: (account: Account) => void;
};

export const MultiSelectMultishardHeader = ({
  accounts,
  invalid,
  chainId,
  error,
  getAccountOption,
  onAccountChange,
}: Props) => {
  const { t } = useI18n();

  const [activeAccount, setActiveAccount] = useState<DropdownResult<Account | MultisigAccount>>();
  const [accountsOptions, setAccountsOptions] = useState<DropdownOption<Account | MultisigAccount>[]>([]);

  useEffect(() => {
    const options = accounts.reduce<any[]>((acc, account) => {
      const isBaseAccount = accountUtils.isBaseAccount(account);
      const isChainMatch = accountUtils.isChainIdMatch(account, chainId);

      if (isBaseAccount || isChainMatch) {
        acc.push(getAccountOption(account));
      }

      return acc;
    }, []);

    if (options.length === 0) return;

    setAccountsOptions(options);

    if (!activeAccount) {
      changeAccount({ id: options[0].id, value: options[0].value });
    }
  }, [accounts.length, getAccountOption]);

  const changeAccount = (account: DropdownResult<Account>) => {
    onAccountChange(account.value);
    setActiveAccount(account);
  };

  return (
    <div className="flex flex-col gap-y-2 mb-4" data-testid="shards-select">
      <Select
        label={t('transfer.senderLabel')}
        placeholder={t('receive.selectWalletPlaceholder')}
        invalid={invalid}
        selectedId={activeAccount?.id}
        disabled={accountsOptions.length === 1}
        options={accountsOptions}
        onChange={changeAccount}
      />
      <InputHint active={Boolean(error)} variant="error">
        {t(error || '')}
      </InputHint>
    </div>
  );
};
