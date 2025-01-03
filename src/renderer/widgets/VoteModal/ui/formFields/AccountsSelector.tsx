import { BN_ZERO } from '@polkadot/util';

import { type Asset, type Balance, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { InputHint } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { Field, Select } from '@/shared/ui-kit';
import { type AnyAccount } from '@/domains/network';
import { AssetBalance } from '@/entities/asset';
import { locksService } from '@/entities/governance';

type Props = {
  value: AnyAccount | null;
  accounts: { account: AnyAccount; balance: Balance | null }[];
  hasError: boolean;
  errorText: string;
  asset: Asset;
  chain: Chain;
  onChange: (value: AnyAccount) => void;
};

export const AccountsSelector = ({ value, accounts, asset, chain, hasError, errorText, onChange }: Props) => {
  const { t } = useI18n();

  const selectAccount = (id: string) => {
    const selectedAccount = accounts.find(({ account }) => id === account.id);
    if (!selectedAccount) return;

    onChange(selectedAccount.account);
  };

  return (
    <Field text={t('governance.vote.field.accounts')}>
      <Select
        placeholder={t('governance.vote.field.accountsPlaceholder')}
        invalid={hasError}
        value={value?.id ?? null}
        onChange={(id) => selectAccount(id)}
      >
        {accounts.map(({ account, balance }) => {
          const address = toAddress(account.accountId, { prefix: chain.addressPrefix });
          const availableBalance = balance ? locksService.getAvailableBalance(balance) : BN_ZERO;

          return (
            <Select.Item key={account.id} value={account.id}>
              <div className="flex w-full items-center justify-between gap-2 text-start text-body">
                <Address
                  showIcon
                  hideAddress
                  title={account.name}
                  address={address}
                  variant="truncate"
                  iconSize={16}
                  canCopy={false}
                />
                <AssetBalance className="whitespace-nowrap" value={availableBalance} asset={asset} />
              </div>
            </Select.Item>
          );
        })}
      </Select>

      <InputHint variant="error" active={hasError}>
        {errorText}
      </InputHint>
    </Field>
  );
};
