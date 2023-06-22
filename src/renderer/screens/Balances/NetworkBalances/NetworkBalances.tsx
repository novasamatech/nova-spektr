import { BN } from '@polkadot/util';

import { Icon } from '@renderer/components/ui';
import { Asset } from '@renderer/domain/asset';
import { Chain } from '@renderer/domain/chain';
import { AccountId } from '@renderer/domain/shared-kernel';
import { useBalance } from '@renderer/services/balance/balanceService';
import { ZERO_BALANCE } from '@renderer/services/balance/common/constants';
import { totalAmount } from '@renderer/shared/utils/balance';
import { ExtendedChain } from '@renderer/services/network/common/types';
import AssetBalanceCard from '../AssetBalanceCard/AssetBalanceCard';
import { useI18n } from '@renderer/context/I18nContext';
import { Balance } from '@renderer/domain/balance';
import { includes } from '@renderer/shared/utils/strings';
import { CaptionText, IconButton, Tooltip } from '@renderer/components/ui-redesign';
import { useToggle } from '@renderer/shared/hooks';

type Props = {
  hideZeroBalance?: boolean;
  searchSymbolOnly?: boolean;
  query?: string;
  chain: Chain | ExtendedChain;
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

const NetworkBalances = ({
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
  const [isCardShown, toggleCard] = useToggle(true);
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
    <li aria-expanded={isCardShown} className="w-[546px] mx-auto">
      <div className="bg-white sticky top-0 z-[1]">
        <div className="flex items-center justify-between mb-1 bg-main-app-background hover:bg-block-background-hover rounded">
          <div className="flex items-center">
            <h2 className="flex items-center gap-x-2 px-2 py-1.5">
              <img src={chain.icon} width={20} height={20} alt="" />
              <CaptionText className="uppercase text-text-tertiary">{chain.name}</CaptionText>
            </h2>
            {hasFailedVerification && (
              <div className="flex items-center gap-x-2 text-text-warning">
                {/* TODO fix tooltip not visible when first displayed network invalid. For now just render it below icon */}
                <Tooltip content={t('balances.verificationTooltip')} pointer="up">
                  <Icon name="warn" className="cursor-pointer" size={16} />
                </Tooltip>
                <CaptionText className="uppercase text-inherit">{t('balances.verificationFailedLabel')}</CaptionText>
              </div>
            )}
          </div>
          <IconButton name={isCardShown ? 'down' : 'up'} className="p-2" onClick={toggleCard} />
        </div>
      </div>

      {isCardShown && (
        <ul className="flex flex-col gap-y-1.5">
          {filteredAssets.map((asset) => (
            <AssetBalanceCard
              key={asset.assetId}
              asset={asset}
              balance={balancesObject[asset.assetId.toString()]}
              canMakeActions={canMakeActions}
              onReceiveClick={() => onReceiveClick?.(asset)}
              onTransferClick={() => onTransferClick?.(asset)}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

export default NetworkBalances;
