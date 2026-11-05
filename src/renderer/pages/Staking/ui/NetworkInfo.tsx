import { BN, BN_ZERO } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { type PropsWithChildren } from 'react';

import { type Chain, type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { getRelaychainAsset, nullable } from '@/shared/lib/utils';
import { FootnoteText, HelpText, IconButton, Plate } from '@/shared/ui';
import { AssetBalance, ChainSelect } from '@/shared/ui-entities';
import { Skeleton, Tooltip } from '@/shared/ui-kit';
import { type DataCompleteness } from '@/domains/staking';
import { networkModel } from '@/entities/network';
import { AssetFiatBalance } from '@/widgets/price';

const getTotal = (values: string[]): BN => {
  return values.reduce((acc, value) => {
    if (nullable(value)) return acc;
    return acc.add(new BN(value));
  }, BN_ZERO);
};

type Props = {
  chain: Chain | null;
  rewards: string[];
  /**
   * How far the rewards can be trusted. Only `complete` makes their sum a
   * total: `partial` is a lower bound, `unavailable` could not be loaded.
   */
  rewardsCompleteness: DataCompleteness;
  isRewardsLoading: boolean;
  isStakingLoading: boolean;
  totalStakes: string[];
  onNetworkChange: (chainId: ChainId) => void;
};

export const NetworkInfo = ({
  chain,
  rewards,
  rewardsCompleteness,
  isRewardsLoading,
  isStakingLoading,
  totalStakes,
  children,
  onNetworkChange,
}: PropsWithChildren<Props>) => {
  const { t } = useI18n();

  const [isChildrenShown, toggleChildren] = useToggle();

  const chains = useUnit(networkModel.$chains);

  const totalInfo: {
    isLoading: boolean;
    title: string;
    amount: string;
    asset: ReturnType<typeof getRelaychainAsset>;
    completeness: DataCompleteness;
  }[] = [
    {
      isLoading: isStakingLoading,
      title: t('staking.overview.totalStakedLabel'),
      amount: getTotal(totalStakes).toString(),
      asset: getRelaychainAsset(chain?.assets),
      completeness: 'complete',
    },
    {
      isLoading: isRewardsLoading,
      title: t('staking.overview.totalRewardsLabel'),
      amount: getTotal(rewards).toString(),
      asset: getRelaychainAsset(chain?.assets),
      completeness: rewardsCompleteness,
    },
  ];

  return (
    <Plate className="flex w-full flex-col gap-y-3">
      <div className="grid grid-cols-[178px_repeat(2,122px)_28px] items-start gap-x-6">
        <div className="flex flex-col gap-y-2">
          <FootnoteText className="text-text-secondary">{t('staking.overview.networkLabel')}</FootnoteText>
          <ChainSelect
            placeholder={t('staking.overview.networkPlaceholder')}
            value={chain}
            options={Object.values(chains).filter(({ assets }) => getRelaychainAsset(assets))}
            onChange={(selectedChain) => onNetworkChange(selectedChain.chainId)}
          />
        </div>
        {totalInfo.map(({ isLoading, title, amount, asset, completeness }) =>
          isLoading || nullable(asset) ? (
            <div key={title} className="flex flex-col gap-y-1" data-testid="value-loading">
              <FootnoteText className="text-text-secondary">{title}</FootnoteText>
              <Skeleton width={30} height={4} />
              <Skeleton width={10} height={4} />
            </div>
          ) : completeness === 'unavailable' ? (
            // Nothing could be loaded: a `0` here would state that nothing was
            // earned.
            <div key={title} className="flex flex-col gap-y-0.5 text-left">
              <FootnoteText className="text-text-secondary">{title}</FootnoteText>
              <FootnoteText className="text-text-tertiary">{t('staking.overview.rewardsUnavailable')}</FootnoteText>
            </div>
          ) : (
            <div key={title} className="flex flex-col gap-y-0.5 text-left">
              <FootnoteText className="text-text-secondary">{title}</FootnoteText>
              <AssetBalance value={amount.toString()} asset={asset} className="font-manrope text-small-title" />
              <AssetFiatBalance amount={amount.toString()} asset={asset} />
              {/* A source that did not answer leaves the sum a lower bound. */}
              {completeness === 'partial' ? (
                <Tooltip>
                  <Tooltip.Trigger>
                    <div className="w-fit">
                      <HelpText className="text-text-warning">{t('staking.overview.rewardsIncomplete')}</HelpText>
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Content>{t('staking.overview.rewardsIncompleteHint')}</Tooltip.Content>
                </Tooltip>
              ) : null}
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
