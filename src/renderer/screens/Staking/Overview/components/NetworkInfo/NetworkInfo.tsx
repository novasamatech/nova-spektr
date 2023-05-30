import { PropsWithChildren, useEffect, useState } from 'react';
import { BN, BN_ZERO } from '@polkadot/util';

import { Select, FootnoteText, Plate, IconButton, SmallTitleText } from '@renderer/components/ui-redesign';
import { DropdownOption, DropdownResult } from '@renderer/components/ui-redesign/Dropdowns/common/types';
import { getRelaychainAsset } from '@renderer/shared/utils/assets';
import { useChains } from '@renderer/services/network/chainsService';
import { useSettingsStorage } from '@renderer/services/settings/settingsStorage';
import { Chain } from '@renderer/domain/chain';
import { useToggle } from '@renderer/shared/hooks';
import { useI18n } from '@renderer/context/I18nContext';
import { Shimmering, Balance } from '@renderer/components/ui';

const getTotal = (values: string[]): BN => {
  return values.reduce((acc, value) => acc.add(new BN(value || 0)), BN_ZERO);
};

type Props = {
  rewards: string[];
  isRewardsLoading: boolean;
  isStakingLoading: boolean;
  totalStakes: string[];
  onNetworkChange: (value: Chain) => void;
};

const NetworkInfo = ({
  rewards,
  isRewardsLoading,
  isStakingLoading,
  totalStakes,
  children,
  onNetworkChange,
}: PropsWithChildren<Props>) => {
  const { t } = useI18n();
  const { sortChains, getChainsData } = useChains();
  const { getStakingNetwork } = useSettingsStorage();

  const [isChildrenShown, toggleChildren] = useToggle();
  const [networks, setNetworks] = useState<DropdownOption<Chain>[]>([]);
  const [activeNetwork, setActiveNetwork] = useState<DropdownResult<Chain>>();

  useEffect(() => {
    getChainsData().then((chainsData) => {
      const relaychains = sortChains(chainsData).reduce<DropdownOption<Chain>[]>((acc, chain) => {
        const { chainId, icon, name, assets } = chain;

        if (getRelaychainAsset(assets)) {
          const element = (
            <div className="flex items-center gap-x-2 overflow-hidden">
              <img src={icon} alt={name} width={16} height={16} />
              <FootnoteText className="truncate">{name}</FootnoteText>
            </div>
          );

          acc.push({ id: chainId, value: chain, element });
        }

        return acc;
      }, []);

      const settingsChainId = getStakingNetwork();
      const settingsChain = relaychains.find((chain) => chain.id === settingsChainId);

      setNetworks(relaychains);
      setActiveNetwork(settingsChain || { id: relaychains[0].id, value: relaychains[0].value });
      onNetworkChange(settingsChain?.value || relaychains[0].value);
    });
  }, []);

  const totalInfo = [
    {
      isLoading: isStakingLoading,
      title: t('staking.overview.totalStakedLabel'),
      amount: getTotal(totalStakes).toString(),
      asset: getRelaychainAsset(activeNetwork?.value.assets),
    },
    {
      isLoading: isRewardsLoading,
      title: t('staking.overview.totalRewardsLabel'),
      amount: getTotal(rewards).toString(),
      asset: getRelaychainAsset(activeNetwork?.value.assets),
    },
  ];

  return (
    <Plate className="flex flex-col gap-y-3 w-full">
      <div className="grid grid-cols-[178px,repeat(2,122px),28px] items-center gap-x-6">
        <Select
          placeholder={t('staking.overview.networkPlaceholder')}
          options={networks}
          selectedId={activeNetwork?.id}
          onChange={(chain) => {
            setActiveNetwork(chain);
            onNetworkChange(chain.value);
          }}
        />
        {totalInfo.map(({ isLoading, title, amount, asset }) =>
          isLoading || !asset ? (
            <div key={title} className="flex flex-col gap-y-1" data-testid="value-loading">
              <Shimmering width={80} height={14} />
              <Shimmering width={122} height={22} />
            </div>
          ) : (
            <div key={title} className="text-left">
              <FootnoteText className="text-text-secondary">{title}</FootnoteText>
              <SmallTitleText>
                <Balance value={amount.toString()} precision={asset.precision} symbol={asset.symbol} />
              </SmallTitleText>
            </div>
          ),
        )}
        <IconButton name="down" onClick={toggleChildren} />
      </div>

      {isChildrenShown && (
        <>
          <hr className="border-divider -mx-3" />
          {children}
        </>
      )}
    </Plate>
  );
};

export default NetworkInfo;
