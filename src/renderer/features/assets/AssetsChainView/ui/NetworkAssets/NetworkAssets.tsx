import { useUnit } from 'effector-react';
import groupBy from 'lodash/groupBy';
import { memo, useEffect, useMemo, useState } from 'react';

import { sumBalances } from '@/shared/api/network/service/chainsService';
import { type Account, type Asset, type Balance, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { ZERO_BALANCE, totalAmount } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { CaptionText, Icon } from '@/shared/ui';
import { Accordion, Tooltip } from '@/shared/ui-kit';
import { balanceModel } from '@/entities/balance';
import { ChainTitle } from '@/entities/chain';
import { type ExtendedChain } from '@/entities/network';
import { currencyModel, priceProviderModel } from '@/entities/price';
import { accountUtils } from '@/entities/wallet';
import { balanceSorter } from '../../lib/utils';
import { AssetCard } from '../AssetCard/AssetCard';
import { NetworkFiatBalance } from '../NetworkFiatBalance';

type Props = {
  chain: Chain | ExtendedChain;
  accounts: Account[];
  query: string;
  hideZeroBalances: boolean;
};

export const NetworkAssets = memo(({ chain, accounts, query, hideZeroBalances }: Props) => {
  const { t } = useI18n();

  const assetsPrices = useUnit(priceProviderModel.$assetsPrices);
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);
  const currency = useUnit(currencyModel.$activeCurrency);
  const balances = useUnit(balanceModel.$balances);

  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [balancesObject, setBalancesObject] = useState<Record<string, Balance>>({});

  const selectedAccountIds = accounts.map((a) => a.accountId).join('');

  const accountIds = useMemo(() => {
    return accounts.reduce<AccountId[]>((acc, account) => {
      if (accountUtils.isChainIdMatch(account, chain.chainId)) {
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
    const groupedBalances = Object.values(groupBy(chainBalances, 'assetId'));

    for (const accountBalances of groupedBalances) {
      let total = {} as Balance;

      for (const balance of accountBalances) {
        total = sumBalances(balance, total);
      }

      newBalancesObject[accountBalances[0].assetId] = total;
    }

    setBalancesObject(newBalancesObject);
  }, [chainBalances, accountIds.join('')]);

  useEffect(() => {
    const filteredAssets = chain.assets.filter((asset) => {
      if (query) return true;

      const balance = balancesObject[asset.assetId];

      return !hideZeroBalances || balance?.verified === false || totalAmount(balance) !== ZERO_BALANCE;
    });

    filteredAssets.sort((a, b) =>
      balanceSorter(a, b, balancesObject, assetsPrices, fiatFlag ? currency?.coingeckoId : undefined),
    );

    setFilteredAssets(filteredAssets);
  }, [balancesObject, query, hideZeroBalances]);

  if (filteredAssets.length === 0) {
    return null;
  }

  const hasFailedVerification = balances?.some((b) => b.verified !== undefined && !b.verified);

  return (
    <Accordion initialOpen>
      <Accordion.Trigger sticky>
        <div className="flex w-full items-center justify-between gap-x-2">
          <div className="flex items-center gap-x-2">
            <ChainTitle chain={chain} fontClass="text-caption uppercase" as="h2" iconSize={20} />

            {hasFailedVerification && (
              <div className="flex items-center gap-x-2 text-text-warning">
                {/* FIXME: tooltip not visible when first displayed network invalid. For now just render it below icon */}
                <Tooltip>
                  <Tooltip.Trigger>
                    <div tabIndex={0}>
                      <Icon name="warn" className="cursor-pointer text-inherit" size={16} />
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Content>{t('balances.verificationTooltip')}</Tooltip.Content>
                </Tooltip>
                <CaptionText className="uppercase text-inherit">{t('balances.verificationFailedLabel')}</CaptionText>
              </div>
            )}
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
              balance={balancesObject[asset.assetId.toString()]}
            />
          ))}
        </ul>
      </Accordion.Content>
    </Accordion>
  );
});
