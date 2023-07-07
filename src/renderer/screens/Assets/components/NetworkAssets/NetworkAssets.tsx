import { useEffect, useMemo, useState } from 'react';
import { groupBy } from 'lodash';

import { Icon } from '@renderer/components/ui';
import { Asset } from '@renderer/domain/asset';
import { Chain as ChainType } from '@renderer/domain/chain';
import { useBalance } from '@renderer/services/balance/balanceService';
import { ZERO_BALANCE } from '@renderer/services/balance/common/constants';
import { totalAmount } from '@renderer/shared/utils/balance';
import { ExtendedChain } from '@renderer/services/network/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { Balance } from '@renderer/domain/balance';
import { includes } from '@renderer/shared/utils/strings';
import { CaptionText, Chain, Tooltip, Accordion } from '@renderer/components/ui-redesign';
import { AssetCard } from '../AssetCard/AssetCard';
import { balanceSorter, sumBalances } from '../../common/utils';
import { BalanceDS } from '@renderer/services/storage';
import { Account } from '@renderer/domain/account';
import { AccountId } from '@renderer/domain/shared-kernel';
import cnTw from '@renderer/shared/utils/twMerge';

type Props = {
  hideZeroBalance?: boolean;
  searchSymbolOnly?: boolean;
  query?: string;
  chain: ChainType | ExtendedChain;
  accounts: Account[];
  canMakeActions?: boolean;
  onReceiveClick?: (asset: Asset) => void;
  onTransferClick?: (asset: Asset) => void;
};

export const NetworkAssets = ({
  query,
  hideZeroBalance,
  chain,
  accounts,
  searchSymbolOnly,
  canMakeActions,
  onReceiveClick,
  onTransferClick,
}: Props) => {
  const { t } = useI18n();
  const { getLiveNetworkBalances } = useBalance();

  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [balancesObject, setBalancesObject] = useState<Record<string, Balance>>({});

  const accountIds = useMemo(
    () =>
      accounts.reduce<AccountId[]>((acc, account) => {
        if (!account.chainId || account.chainId === chain.chainId) acc.push(account.accountId);

        return acc;
      }, []),
    [chain.chainId, accounts.map((a) => a.accountId).join('')],
  );

  const balances = getLiveNetworkBalances(accountIds, chain.chainId);

  useEffect(() => {
    const newBalancesObject = Object.values(groupBy(balances, 'assetId')).reduce<Record<string, Balance>>(
      (acc, balances: BalanceDS[]) => {
        if (balances.length !== new Set(accountIds).size) return acc;

        acc[balances[0].assetId] = balances.reduce<Balance>((acc, balance) => sumBalances(balance, acc), {} as Balance);

        return acc;
      },
      {},
    );

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

      return !hideZeroBalance || balance?.verified === false || (balance && totalAmount(balance) !== ZERO_BALANCE);
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
          className={cnTw(
            'sticky top-0 z-10 bg-background-default px-2 py-1.5',
            'transition-colors rounded hover:bg-block-background-hover focus-visible:bg-block-background-hover',
          )}
        >
          <div className="flex items-center justify-between gap-x-2">
            <Chain chain={chain} fontClass="text-caption uppercase" as="h2" iconSize={20} />

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
                asset={asset}
                balance={balancesObject[asset.assetId.toString()]}
                canMakeActions={canMakeActions}
                onReceiveClick={() => onReceiveClick?.(asset)}
                onTransferClick={() => onTransferClick?.(asset)}
              />
            ))}
          </ul>
        </Accordion.Content>
      </Accordion>
    </li>
  );
};
