import { useEffect, useState } from 'react';

import { Icon } from '@renderer/components/ui';
import { Asset } from '@renderer/domain/asset';
import { Chain as ChainType } from '@renderer/domain/chain';
import { AccountId } from '@renderer/domain/shared-kernel';
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
import cnTw from '@renderer/shared/utils/twMerge';

type Props = {
  hideZeroBalance?: boolean;
  searchSymbolOnly?: boolean;
  query?: string;
  chain: ChainType | ExtendedChain;
  accountIds: AccountId[];
  canMakeActions?: boolean;
  onReceiveClick?: (asset: Asset) => void;
  onTransferClick?: (asset: Asset) => void;
};

export const NetworkAssets = ({
  query,
  hideZeroBalance,
  chain,
  accountIds,
  searchSymbolOnly,
  canMakeActions,
  onReceiveClick,
  onTransferClick,
}: Props) => {
  const { t } = useI18n();
  const { getLiveNetworkBalances } = useBalance();

  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);

  const balances = getLiveNetworkBalances(accountIds, chain.chainId);

  const balancesObject =
    balances?.reduce<Record<string, Balance>>((acc, balance) => {
      acc[balance.assetId] = sumBalances(balance, acc[balance.assetId]);

      return acc;
    }, {}) || {};

  useEffect(() => {
    const filteredAssets = chain.assets.filter((asset) => {
      if (query) {
        const hasSymbol = includes(asset.symbol, query);
        const hasChainName = includes(chain.name, query);
        const hasAssetName = includes(asset.name, query);

        return hasSymbol || (!searchSymbolOnly && (hasChainName || hasAssetName));
      }

      const balance = balancesObject[asset.assetId];

      return !hideZeroBalance || !balance?.verified || totalAmount(balance) !== ZERO_BALANCE;
    });
    filteredAssets.sort((a, b) => balanceSorter(a, b, balancesObject));

    setFilteredAssets(filteredAssets);
  }, [balances, query, hideZeroBalance]);

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
