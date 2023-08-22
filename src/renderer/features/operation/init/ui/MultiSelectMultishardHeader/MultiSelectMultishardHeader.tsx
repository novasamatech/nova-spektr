import { useEffect, useState } from 'react';

import { Account, MultisigAccount } from '@renderer/entities/account';
import { InputHint, Select } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';
import { DropdownOption, DropdownResult } from '@renderer/shared/ui/Dropdowns/common/types';
import { ChainId } from '@renderer/domain/shared-kernel';

type Props = {
  accounts: Account[];
  chainId: ChainId;
  invalid?: boolean;
  error?: string;
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
      const isSameChain = !account.chainId || account.chainId === chainId;

      if (isSameChain) {
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
      <InputHint active={Boolean(error)}>{error}</InputHint>
    </div>
  );
};
