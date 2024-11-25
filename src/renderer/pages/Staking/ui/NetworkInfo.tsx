import { BN, BN_ZERO } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { type PropsWithChildren } from 'react';

import { type Chain, type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { getRelaychainAsset, nullable } from '@/shared/lib/utils';
import { FootnoteText, IconButton, Plate } from '@/shared/ui';
import { Select, Skeleton } from '@/shared/ui-kit';
import { AssetBalance } from '@/entities/asset';
import { ChainTitle } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { AssetFiatBalance } from '@/entities/price';

const getTotal = (values: string[]): BN => {
  return values.reduce((acc, value) => acc.add(new BN(value || 0)), BN_ZERO);
};

type Props = {
  chain: Chain | null;
  rewards: string[];
  isRewardsLoading: boolean;
  isStakingLoading: boolean;
  totalStakes: string[];
  onNetworkChange: (chainId: ChainId) => void;
};

export const NetworkInfo = ({
  chain,
  rewards,
  isRewardsLoading,
  isStakingLoading,
  totalStakes,
  children,
  onNetworkChange,
}: PropsWithChildren<Props>) => {
  const { t } = useI18n();

  const [isChildrenShown, toggleChildren] = useToggle();

  const chains = useUnit(networkModel.$chains);

  const totalInfo = [
    {
      isLoading: isStakingLoading,
      title: t('staking.overview.totalStakedLabel'),
      amount: getTotal(totalStakes).toString(),
      asset: getRelaychainAsset(chain?.assets),
    },
    {
      isLoading: isRewardsLoading,
      title: t('staking.overview.totalRewardsLabel'),
      amount: getTotal(rewards).toString(),
      asset: getRelaychainAsset(chain?.assets),
    },
  ];

  return (
    <Plate className="flex w-full flex-col gap-y-3">
      <div className="grid grid-cols-[178px,repeat(2,122px),28px] items-start gap-x-6">
        <div className="flex flex-col gap-y-2">
          <FootnoteText className="text-text-secondary">{t('staking.overview.networkLabel')}</FootnoteText>
          <Select
            placeholder={t('staking.overview.networkPlaceholder')}
            value={chain?.chainId ?? null}
            onChange={onNetworkChange}
          >
            {Object.values(chains)
              .filter(({ assets }) => getRelaychainAsset(assets))
              .map((chain) => (
                <Select.Item key={chain.chainId} value={chain.chainId}>
                  <ChainTitle className="overflow-hidden" fontClass="text-text-primary truncate" chain={chain} />
                </Select.Item>
              ))}
          </Select>
        </div>
        {totalInfo.map(({ isLoading, title, amount, asset }) =>
          isLoading || nullable(asset) ? (
            <div key={title} className="flex flex-col gap-y-1" data-testid="value-loading">
              <FootnoteText className="text-text-secondary">{title}</FootnoteText>
              <Skeleton width={30} height={4} />
              <Skeleton width={10} height={4} />
            </div>
          ) : (
            <div key={title} className="flex flex-col gap-y-0.5 text-left">
              <FootnoteText className="text-text-secondary">{title}</FootnoteText>
              <AssetBalance value={amount.toString()} asset={asset} className="font-manrope text-small-title" />
              <AssetFiatBalance amount={amount.toString()} asset={asset} />
            </div>
          ),
        )}
        <IconButton className="self-center" name={isChildrenShown ? 'up' : 'down'} onClick={toggleChildren} />
      </div>

      {isChildrenShown && (
        <>
          <hr className="-mx-3 border-divider" />
          {children}
        </>
      )}
    </Plate>
  );
};
