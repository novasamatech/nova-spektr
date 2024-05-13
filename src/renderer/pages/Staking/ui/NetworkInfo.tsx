import { PropsWithChildren, useEffect, useState } from 'react';
import { BN, BN_ZERO } from '@polkadot/util';

import { Select, FootnoteText, Plate, IconButton, Shimmering } from '@shared/ui';
import { DropdownOption, DropdownResult } from '@shared/ui/types';
import { getRelaychainAsset } from '@shared/lib/utils';
import { chainsService } from '@shared/api/network';
import { settingsStorage } from '@entities/settings';
import { ChainTitle } from '@entities/chain';
import { useToggle } from '@shared/lib/hooks';
import { useI18n } from '@app/providers';
import { AssetBalance } from '@entities/asset';
import type { Chain } from '@shared/core';
import { AssetFiatBalance } from '@entities/price/ui/AssetFiatBalance';

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

  const [isChildrenShown, toggleChildren] = useToggle();
  const [networks, setNetworks] = useState<DropdownOption<Chain>[]>([]);
  const [activeNetwork, setActiveNetwork] = useState<DropdownResult<Chain>>();

  useEffect(() => {
    const chains = chainsService.getChainsData({ sort: true });
    const relaychains = chains.reduce<DropdownOption<Chain>[]>((acc, chain) => {
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

    const settingsChainId = settingsStorage.getStakingNetwork();
    const settingsChain = relaychains.find((chain) => chain.id === settingsChainId);

    setNetworks(relaychains);
    setActiveNetwork(settingsChain || { id: relaychains[0].id, value: relaychains[0].value });
    onNetworkChange(settingsChain?.value || relaychains[0].value);
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
        <div className="flex flex-col gap-y-2">
          <FootnoteText className="text-text-secondary">{t('staking.overview.networkLabel')}</FootnoteText>
          <Select
            placeholder={t('staking.overview.networkPlaceholder')}
            options={networks}
            selectedId={activeNetwork?.id}
            onChange={(chain) => {
              setActiveNetwork(chain);
              settingsStorage.setStakingNetwork(chain.value.chainId);
              onNetworkChange(chain.value);
            }}
          />
        </div>
        {totalInfo.map(({ isLoading, title, amount, asset }) =>
          isLoading || !asset ? (
            <div key={title} className="flex flex-col gap-y-1" data-testid="value-loading">
              <FootnoteText className="text-text-secondary">{title}</FootnoteText>
              <Shimmering width={122} height={20} />
              <Shimmering width={47} height={18} />
            </div>
          ) : (
            <div key={title} className="text-left">
              <FootnoteText className="text-text-secondary">{title}</FootnoteText>
              <AssetBalance value={amount.toString()} asset={asset} className="text-small-title font-manrope" />
              <AssetFiatBalance amount={amount.toString()} asset={asset} />
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
