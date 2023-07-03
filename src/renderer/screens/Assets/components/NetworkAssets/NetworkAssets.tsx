import { BN } from '@polkadot/util';

import cnTw from '@renderer/shared/utils/twMerge';
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

const sumValues = (firstValue?: string, secondValue?: string): string => {
  if (firstValue && secondValue) {
    return new BN(firstValue).add(new BN(secondValue)).toString();
  }

  return '0';
};

const sumBalances = (firstBalance: Balance, secondBalance?: Balance): Balance => {
  if (!secondBalance) return firstBalance;

  return {
    ...firstBalance,
    verified: firstBalance.verified && secondBalance.verified,
    free: sumValues(firstBalance.free, secondBalance.free),
    reserved: sumValues(firstBalance.reserved, secondBalance.reserved),
    frozen: sumValues(firstBalance.frozen, secondBalance.frozen),
    locked: (firstBalance.locked || []).concat(secondBalance.locked || []),
  };
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

  const balances = getLiveNetworkBalances(accountIds, chain.chainId);

  const balancesObject =
    balances?.reduce<Record<string, Balance>>((acc, balance) => {
      acc[balance.assetId] = sumBalances(balance, acc[balance.assetId]);

      return acc;
    }, {}) || {};

  const filteredAssets = chain.assets.filter((asset) => {
    if (query) {
      return (
        includes(asset.symbol, query) ||
        (!searchSymbolOnly && (includes(chain.name, query) || includes(asset.name, query)))
      );
    }

    const balance = balancesObject[asset.assetId];

    return (
      !hideZeroBalance || !balance || balance.verified !== true || (balance && totalAmount(balance) !== ZERO_BALANCE)
    );
  });

  if (filteredAssets.length === 0) {
    return null;
  }

  const hasFailedVerification = balances?.some((b) => !b.verified);

  return (
    <Accordion isDefaultOpen>
      <Accordion.Button className={cnTw('sticky top-0 z-10 bg-background-default px-2 py-1.5')}>
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
  );
};
