import { PropsWithChildren, useEffect, useState } from 'react';
import { BN, BN_ZERO } from '@polkadot/util';

import { Select, FootnoteText, Plate, IconButton, Shimmering } from '@renderer/shared/ui';
import { DropdownOption, DropdownResult } from '@renderer/shared/ui/types';
import { getRelaychainAsset } from '@renderer/shared/lib/utils';
import { useChains } from '@renderer/entities/network';
import { useSettingsStorage } from '@renderer/entities/setttings';
import { Chain, ChainTitle } from '@renderer/entities/chain';
import { useToggle } from '@renderer/shared/lib/hooks';
import { useI18n } from '@renderer/app/providers';
import { AssetBalance } from '@renderer/entities/asset';

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

export const NetworkInfo = ({
  rewards,
  isRewardsLoading,
  isStakingLoading,
  totalStakes,
  children,
  onNetworkChange,
}: PropsWithChildren<Props>) => {
  const { t } = useI18n();
  const { sortChains, getChainsData } = useChains();
  const { getStakingNetwork, setStakingNetwork } = useSettingsStorage();

  const [isChildrenShown, toggleChildren] = useToggle();
  const [networks, setNetworks] = useState<DropdownOption<Chain>[]>([]);
  const [activeNetwork, setActiveNetwork] = useState<DropdownResult<Chain>>();

  useEffect(() => {
    getChainsData().then((chainsData) => {
      const relaychains = sortChains(chainsData).reduce<DropdownOption<Chain>[]>((acc, chain) => {
        const { chainId, assets } = chain;

        if (getRelaychainAsset(assets)) {
          // without key dropdown doesn't show changes (thought functionally everything works fine)
          // TODO look into it
          const element = (
            <ChainTitle
              key={chain.chainId}
              className="overflow-hidden"
              fontClass="text-text-primary truncate"
              chain={chain}
            />
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
            setStakingNetwork(chain.value.chainId);
            onNetworkChange(chain.value);
          }}
        />
        {totalInfo.map(({ isLoading, title, amount, asset }) =>
          isLoading || !asset ? (
            <div key={title} className="flex flex-col gap-y-1" data-testid="value-loading">
              <Shimmering width={80} height={12} />
              <Shimmering width={122} height={20} />
            </div>
          ) : (
            <div key={title} className="text-left">
              <FootnoteText className="text-text-secondary">{title}</FootnoteText>
              <AssetBalance value={amount.toString()} asset={asset} className="text-small-title" />
            </div>
          ),
        )}
        <IconButton name={isChildrenShown ? 'up' : 'down'} onClick={toggleChildren} />
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
