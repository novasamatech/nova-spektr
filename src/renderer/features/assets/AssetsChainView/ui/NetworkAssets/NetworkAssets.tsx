import { useUnit } from 'effector-react';
import { memo, useEffect, useMemo, useState } from 'react';

import { sumBalances } from '@/shared/api/network/service/chainsService';
import { type Asset, type Balance, type Chain, type Wallet } from '@/shared/core';
import { ZERO_BALANCE, entries, groupBy, nullable, totalAmount } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Accordion } from '@/shared/ui-kit';
import { type AnyAccount, accountService } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { ChainTitle } from '@/entities/chain';
import { type ExtendedChain } from '@/entities/network';
import { currencyModel, priceProviderModel } from '@/entities/price';
import { balanceSorter } from '../../lib/utils';
import { AssetCard } from '../AssetCard/AssetCard';
import { NetworkFiatBalance } from '../NetworkFiatBalance';

type Props = {
  chain: Chain | ExtendedChain;
  accounts: AnyAccount[];
  query: string;
  hideZeroBalances: boolean;
  wallet: Wallet | null;
};

export const NetworkAssets = memo(({ chain, accounts, query, hideZeroBalances, wallet }: Props) => {
  const assetsPrices = useUnit(priceProviderModel.$assetsPrices);
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);
  const currency = useUnit(currencyModel.$activeCurrency);
  const balances = useUnit(balanceModel.$balances);

  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [balancesObject, setBalancesObject] = useState<Record<string, Balance>>({});

  const selectedAccountIds = accounts.map((a) => a.accountId).join('');

  const accountIds = useMemo(() => {
    return accounts.reduce<AccountId[]>((acc, account) => {
      if (accountService.isAccountAvailableOnChain(account, chain)) {
        acc.push(account.accountId);
      }

      return acc;
    }, []);
  }, [chain.chainId, selectedAccountIds]);

  const chainBalances = useMemo(
    () => balances.filter((b) => b.chainId === chain.chainId && accountIds.includes(b.accountId)),
    [balances, chain, accountIds],
  );

  useEffect(() => {
    const newBalancesObject: Record<string, Balance> = {};
    const groupedBalances = groupBy(chainBalances, (b) => b.assetId.toString());

    for (const [assetId, accountBalances] of entries(groupedBalances)) {
      if (nullable(accountBalances)) {
        continue;
      }

      let total = undefined;

      for (const balance of accountBalances) {
        total = sumBalances(balance, total);
      }

      if (total) {
        newBalancesObject[assetId] = total;
      }
    }

    setBalancesObject(newBalancesObject);
  }, [chainBalances, accountIds.join('')]);

  useEffect(() => {
    const filteredAssets = chain.assets.filter((asset) => {
      if (query) return true;

      const balance = balancesObject[asset.assetId];

      return !hideZeroBalances || totalAmount(balance ?? null) !== ZERO_BALANCE;
    });

    filteredAssets.sort((a, b) =>
      balanceSorter(a, b, balancesObject, assetsPrices, fiatFlag ? currency?.coingeckoId : undefined),
    );

    setFilteredAssets(filteredAssets);
  }, [balancesObject, query, hideZeroBalances]);

  if (filteredAssets.length === 0) {
    return null;
  }

  return (
    <div className="w-[736px]">
      <Accordion initialOpen>
        <Accordion.Trigger sticky>
          <div className="flex w-full items-center justify-between gap-x-2">
            <div className="flex items-center gap-x-2">
              <ChainTitle chain={chain} fontClass="text-caption uppercase" as="h2" iconSize={20} />
            </div>
            <NetworkFiatBalance balances={balancesObject} assets={filteredAssets} />
          </div>
        </Accordion.Trigger>
        <Accordion.Content>
          <ul className="mt-1 flex flex-col gap-y-1.5">
            {filteredAssets.map((asset) => (
              <AssetCard
                key={asset.assetId}
                chainId={chain.chainId}
                asset={asset}
                balance={balancesObject[asset.assetId.toString()] ?? null}
                wallet={wallet}
              />
            ))}
          </ul>
        </Accordion.Content>
      </Accordion>
    </div>
  );
});
