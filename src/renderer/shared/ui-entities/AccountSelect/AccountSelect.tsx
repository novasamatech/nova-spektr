import { memo } from 'react';

import { type Asset, type BalanceMap, type Chain } from '@/shared/core';
import { nonNullable, toAddress, transferableAmountBN, withdrawableAmountBN } from '@/shared/lib/utils';
import { Select } from '@/shared/ui-kit';
import { type AnyAccount } from '@/domains/network';
import { balanceUtils } from '@/entities/balance';
import { Address } from '../Address/Address';
import { AssetBalance } from '../AssetBalance/AssetBalance';

type Props = {
  value: AnyAccount | null;
  onChange: (value: AnyAccount) => void;
  placeholder: string;
  options: AnyAccount[];
  chain: Chain;
  asset: Asset;
  balances: BalanceMap;
  balanceType: 'withdrawable' | 'transferable';
  testId?: string;
  invalid?: boolean;
};

export const AccountSelect = memo(
  ({ value, onChange, chain, balances, balanceType, asset, options, placeholder, invalid, testId }: Props) => {
    const handleChange = (id: string) => {
      const account = options.find(account => account.id === id);
      if (nonNullable(account)) {
        onChange(account);
      }
    };

    console.log('value', value);

    return (
      <Select
        placeholder={placeholder}
        value={value?.id.toString() ?? null}
        testId={testId}
        invalid={invalid}
        height="md"
        onChange={handleChange}
      >
        {options.map(account => {
          const address = toAddress(account.accountId, { prefix: chain.addressPrefix });
          const balance = balanceUtils.getBalance(balances, account.accountId, chain.chainId, asset.assetId);
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
