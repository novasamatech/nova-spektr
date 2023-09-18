import { useEffect, useMemo, useState } from 'react';
import { groupBy } from 'lodash';

import { Icon, CaptionText, Tooltip, Accordion } from '@renderer/shared/ui';
import { Asset, useBalance, Balance, AssetCard } from '@renderer/entities/asset';
import { Chain, ChainTitle } from '@renderer/entities/chain';
import { ZERO_BALANCE, totalAmount, includes, cnTw } from '@renderer/shared/lib/utils';
import { ExtendedChain } from '@renderer/entities/network';
import { useI18n } from '@renderer/app/providers';
import { balanceSorter, sumBalances } from '../../common/utils';
import { Account } from '@renderer/entities/account';
import { AccountId } from '@renderer/domain/shared-kernel';

type Props = {
  hideZeroBalance?: boolean;
  searchSymbolOnly?: boolean;
  query?: string;
  chain: Chain | ExtendedChain;
  accounts: Account[];
  canMakeActions?: boolean;
};

export const NetworkAssets = ({ query, hideZeroBalance, chain, accounts, searchSymbolOnly, canMakeActions }: Props) => {
  const { t } = useI18n();
  const { getLiveNetworkBalances } = useBalance();

  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [balancesObject, setBalancesObject] = useState<Record<string, Balance>>({});

  const selectedAccountIds = accounts.map((a) => a.accountId).join('');

  const accountIds = useMemo(() => {
    return accounts.reduce<AccountId[]>((acc, account) => {
      if (!account.chainId || account.chainId === chain.chainId) acc.push(account.accountId);

      return acc;
    }, []);
  }, [chain.chainId, selectedAccountIds]);

  const balances = getLiveNetworkBalances(accountIds, chain.chainId);

  useEffect(() => {
    const accountsAmount = new Set(accountIds).size;

    const groupedBalances = Object.values(groupBy(balances, 'assetId'));
    const newBalancesObject = groupedBalances.reduce<Record<string, Balance>>((acc, balances) => {
      if (balances.length === accountsAmount) {
        acc[balances[0].assetId] = balances.reduce<Balance>((acc, balance) => {
          return sumBalances(balance, acc);
        }, {} as Balance);
      }

      return acc;
    }, {});

    setBalancesObject(newBalancesObject);
  }, [balances, accountIds.join('')]);

  useEffect(() => {
    const filteredAssets = chain.assets.filter((asset) => {
      if (query) {
        const hasSymbol = includes(asset.symbol, query);
        const hasChainName = includes(chain.name, query);
        const hasAssetName = includes(asset.name, query);

        return hasSymbol || (!searchSymbolOnly && (hasChainName || hasAssetName));
      }

      const balance = balancesObject[asset.assetId];

      return !hideZeroBalance || balance?.verified === false || totalAmount(balance) !== ZERO_BALANCE;
    });

    filteredAssets.sort((a, b) => balanceSorter(a, b, balancesObject));

    setFilteredAssets(filteredAssets);
  }, [balancesObject, query, hideZeroBalance]);

  if (filteredAssets.length === 0) {
    return null;
  }

  const hasFailedVerification = balances?.some((b) => !b.verified);

  return (
    <li className="w-[546px]">
      <Accordion isDefaultOpen>
        <Accordion.Button
          buttonClass={cnTw(
            'sticky top-0 z-10 bg-background-default px-2 py-1.5',
            'transition-colors rounded hover:bg-block-background-hover focus-visible:bg-block-background-hover',
          )}
        >
          <div className="flex items-center justify-between gap-x-2">
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
        </Accordion.Button>
        <Accordion.Content className="mt-1">
          <ul className="flex flex-col gap-y-1.5">
            {filteredAssets.map((asset) => (
              <AssetCard
                key={asset.assetId}
                chainId={chain.chainId}
                asset={asset}
                balance={balancesObject[asset.assetId.toString()]}
                canMakeActions={canMakeActions}
              />
            ))}
          </ul>
        </Accordion.Content>
      </Accordion>
    </li>
  );
};
