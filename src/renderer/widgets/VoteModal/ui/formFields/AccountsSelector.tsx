import { BN_ZERO } from '@polkadot/util';
import { useMemo } from 'react';

import { type Account, type Asset, type Balance, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { InputHint, Select } from '@/shared/ui';
import { type DropdownOption } from '@/shared/ui/Dropdowns/common/types';
import { Address } from '@/shared/ui-entities';
import { AssetBalance } from '@/entities/asset';
import { locksService } from '@/entities/governance';

type Props = {
  value: Account | null;
  accounts: { account: Account; balance: Balance | null }[];
  hasError: boolean;
  errorText: string;
  asset: Asset;
  chain: Chain;
  onChange: (value: Account) => void;
};

export const AccountsSelector = ({ value, accounts, asset, chain, hasError, errorText, onChange }: Props) => {
  const { t } = useI18n();

  const options = useMemo(
    () =>
      accounts.map<DropdownOption>(({ account, balance }) => {
        const address = toAddress(account.accountId, { prefix: chain.addressPrefix });
        const availableBalance = balance ? locksService.getAvailableBalance(balance) : BN_ZERO;

        return {
          id: account.id.toString(),
          value: account,
          element: (
            <div className="flex w-full items-center justify-between gap-2 text-start text-body" key={account.id}>
              <Address
                address={address}
                variant="truncate"
                showIcon
                iconSize={16}
                canCopy={false}
                title={account.name}
              />
              <AssetBalance className="whitespace-nowrap" value={availableBalance} asset={asset} />
            </div>
          ),
        };
      }),
    [accounts],
  );

  return (
    <div className="flex flex-col gap-y-2">
      <Select
        label={t('governance.vote.field.accounts')}
        placeholder={t('governance.vote.field.accountsPlaceholder')}
        selectedId={value?.id.toString()}
        options={options}
        invalid={hasError}
        onChange={({ value }) => onChange(value)}
      />
      <InputHint variant="error" active={hasError}>
        {errorText}
      </InputHint>
    </div>
  );
};
