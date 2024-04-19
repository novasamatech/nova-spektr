import { useEffect, useMemo, useState } from 'react';
import groupBy from 'lodash/groupBy';
import { useUnit } from 'effector-react';

import { Icon, CaptionText, Tooltip, Accordion } from '@shared/ui';
import { ChainTitle } from '@entities/chain';
import { ZERO_BALANCE, totalAmount, includes, cnTw } from '@shared/lib/utils';
import { ExtendedChain } from '@entities/network';
import { useI18n } from '@app/providers';
import { balanceSorter, sumBalances } from '../../common/utils';
import type { AccountId, Chain, Asset, Balance, Account_NEW } from '@shared/core';
import { accountUtils } from '@entities/wallet';
import { NetworkFiatBalance } from '../NetworkFiatBalance/NetworkFiatBalance';
import { currencyModel, priceProviderModel } from '@entities/price';
import { balanceModel } from '@entities/balance';
import { assetsModel } from '../../model/assets-model';
import { AssetCard } from '../AssetCard/AssetCard';

type Props = {
  searchSymbolOnly?: boolean;
  chain: Chain | ExtendedChain;
  accounts: Account_NEW[];
};

export const NetworkAssets = ({ chain, accounts, searchSymbolOnly }: Props) => {
  const { t } = useI18n();

  const query = useUnit(assetsModel.$query);
  const hideZeroBalances = useUnit(assetsModel.$hideZeroBalances);

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

  useEffect(() => {
    const chainBalances = balances.filter((b) => b.chainId === chain.chainId && accountIds.includes(b.accountId));

    const groupedBalances = Object.values(groupBy(chainBalances, 'assetId'));

    const newBalancesObject = groupedBalances.reduce<Record<string, Balance>>((acc, accountBalances) => {
      acc[accountBalances[0].assetId] = accountBalances.reduce<Balance>((balancesAcc, balance) => {
        return sumBalances(balance, balancesAcc);
      }, {} as Balance);

      return acc;
    }, {});

    setBalancesObject(newBalancesObject);
  }, [balances, accountIds.join('')]);

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

  if (filteredAssets.length === 0) return null;

  const hasFailedVerification = balances?.some((b) => b.verified !== undefined && !b.verified);

  return (
    <li className="w-[546px]">
      <Accordion isDefaultOpen>
        <Accordion.Button
          buttonClass={cnTw(
            'sticky top-0 z-10 bg-background-default px-2 py-1.5',
            'transition-colors rounded hover:bg-block-background-hover focus-visible:bg-block-background-hover',
          )}
        >
          <div className="flex items-center justify-between gap-x-2 w-full">
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
              <li key={asset.assetId}>
                <AssetCard chainId={chain.chainId} asset={asset} balance={balancesObject[asset.assetId.toString()]} />
              </li>
            ))}
          </ul>
        </Accordion.Content>
      </Accordion>
    </li>
  );
};
