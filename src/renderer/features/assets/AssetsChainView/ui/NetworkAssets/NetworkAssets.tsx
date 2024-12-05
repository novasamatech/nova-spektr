import { useUnit } from 'effector-react';
import groupBy from 'lodash/groupBy';
import { memo, useEffect, useMemo, useState } from 'react';

import { sumBalances } from '@/shared/api/network/service/chainsService';
import { type Account, type AccountId, type Asset, type Balance, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { ZERO_BALANCE, cnTw, includes, totalAmount } from '@/shared/lib/utils';
import { Accordion, CaptionText, Icon, Tooltip } from '@/shared/ui';
import { balanceModel } from '@/entities/balance';
import { ChainTitle } from '@/entities/chain';
import { type ExtendedChain } from '@/entities/network';
import { currencyModel, priceProviderModel } from '@/entities/price';
import { accountUtils } from '@/entities/wallet';
import { balanceSorter } from '../../lib/utils';
import { AssetCard } from '../AssetCard/AssetCard';
import { NetworkFiatBalance } from '../NetworkFiatBalance';

type Props = {
  searchSymbolOnly?: boolean;
  chain: Chain | ExtendedChain;
  accounts: Account[];
  query: string;
  hideZeroBalances: boolean;
};

export const NetworkAssets = memo(({ chain, accounts, query, hideZeroBalances, searchSymbolOnly }: Props) => {
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
      if (query) {
        const hasSymbol = includes(asset.symbol, query);
        const hasAssetName = includes(asset.name, query);
        const hasChainName = includes(chain.name, query);

        return hasSymbol || hasAssetName || (!searchSymbolOnly && hasChainName);
      }

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
    <li className="w-[736px]">
      <Accordion isDefaultOpen>
        <Accordion.Button
          buttonClass={cnTw(
            'sticky top-0 z-10 bg-background-default px-2 py-1.5',
            'rounded transition-colors hover:bg-block-background-hover focus-visible:bg-block-background-hover',
          )}
        >
          <div className="flex w-full items-center justify-between gap-x-2">
            <div className="flex items-center gap-x-2">
              <ChainTitle chain={chain} fontClass="text-caption uppercase" as="h2" iconSize={20} />

              {hasFailedVerification && (
                <div className="flex items-center gap-x-2 text-text-warning">
                  {/* FIXME: tooltip not visible when first displayed network invalid. For now just render it below icon */}
                  <Tooltip content={t('balances.verificationTooltip')} pointer="up">
                    <Icon name="warn" className="cursor-pointer" size={16} />
                  </Tooltip>
                  <CaptionText className="uppercase text-inherit">{t('balances.verificationFailedLabel')}</CaptionText>
                </div>
              )}
            </div>
            <NetworkFiatBalance balances={balancesObject} assets={filteredAssets} />
          </div>
        </Accordion.Button>
        <Accordion.Content className="mt-1">
          <ul className="flex flex-col gap-y-1.5">
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
    </li>
  );
});
