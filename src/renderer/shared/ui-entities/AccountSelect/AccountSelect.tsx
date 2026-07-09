import { memo, useMemo, useState } from 'react';

import { type Asset, type BalanceMap, type Chain, type XOR } from '@/shared/core';
import { nonNullable, performSearch, toAddress, transferableAmountBN, withdrawableAmountBN } from '@/shared/lib/utils';
import { Select } from '@/shared/ui-kit';
import { type AnyAccount, useAccountsNames } from '@/domains/network';
import { balanceUtils } from '@/entities/balance';
import { Address } from '../Address/Address';
import { AssetBalance } from '../AssetBalance/AssetBalance';

type Props = {
  value: AnyAccount | null;
  onChange: (value: AnyAccount) => void;
  placeholder: string;
  options: AnyAccount[];
  chain: Chain;
  testId?: string;
  invalid?: boolean;
} & XOR<{
  asset: Asset;
  balances: BalanceMap;
  balanceType: 'withdrawable' | 'transferable';
}>;

export const AccountSelect = memo(
  ({ value, onChange, chain, balances, balanceType, asset, options, placeholder, invalid, testId }: Props) => {
    const resolvedOptions = useAccountsNames(options, chain);
    const [query, setQuery] = useState('');

    const filteredOptions = useMemo(() => {
      return performSearch({
        query,
        records: resolvedOptions,
        getMeta: account => ({ address: toAddress(account.accountId, { prefix: chain.addressPrefix }) }),
        weights: { name: 1, address: 0.5 },
      });
    }, [query, resolvedOptions, chain]);

    const handleChange = (id: string) => {
      const account = options.find(account => account.id === id);
      if (nonNullable(account)) {
        onChange(account);
      }
    };

    return (
      <Select
        placeholder={placeholder}
        value={value?.id.toString() ?? null}
        testId={testId}
        invalid={invalid}
        height="md"
        onSearch={setQuery}
        onChange={handleChange}
      >
        {filteredOptions.map(account => {
          const address = toAddress(account.accountId, { prefix: chain.addressPrefix });
          const balance = balances
            ? balanceUtils.getBalance(balances, account.accountId, chain.chainId, asset.assetId)
            : null;
          const assetBalance =
            balanceType === 'transferable' ? transferableAmountBN(balance) : withdrawableAmountBN(balance);
          return (
            <Select.Item key={account.id} value={account.id}>
              <div className="flex w-full items-center justify-between">
                <Address
                  showIcon
                  variant="truncate"
                  iconSize={20}
                  address={address}
                  title={account.name}
                  canCopy={false}
                />
                {nonNullable(balance) && <AssetBalance value={assetBalance} asset={asset} />}
              </div>
            </Select.Item>
          );
        })}
      </Select>
    );
  },
);
