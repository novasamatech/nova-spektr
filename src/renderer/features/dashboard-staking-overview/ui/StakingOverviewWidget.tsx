import { default as BigNumber } from 'bignumber.js';
import { useState } from 'react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatBalance } from '@/shared/lib/utils';
import { BodyText, FootnoteText, SmallTitleText, TitleText } from '@/shared/ui';
import { Skeleton } from '@/shared/ui-kit';
import { useStakingOverview } from '../hooks/useStakingOverview';

import { ChainAllocationChart } from './ChainAllocationChart';
import { Price } from './Price';
import { StakingDetailModal } from './StakingDetailModal';

type Props = {
  accountIds: string[];
  allEntries: { accountId: string; name: string; address: string }[];
};

const containerClass = 'w-[560px] rounded-lg border border-token-container-border bg-white p-4 shadow-card-shadow';

export const StakingOverviewWidget = ({ accountIds, allEntries }: Props) => {
  const { t } = useI18n();
  const { chains, stakingDataByChain, totalFiat, totalActiveValidators, pending, fiatFlag, currency } =
    useStakingOverview(accountIds);
  const [selectedChainId, setSelectedChainId] = useState<ChainId | null>(null);

  if (!fiatFlag) return null;

  if (accountIds.length === 0) {
    return (
      <div className={containerClass}>
        <FootnoteText className="text-text-tertiary">{t('dashboard.stakingOverview.title')}</FootnoteText>
        <div className="flex flex-col items-center gap-y-1 py-6">
          <SmallTitleText className="text-text-tertiary">{t('dashboard.noSelection.title')}</SmallTitleText>
          <BodyText className="text-text-tertiary">{t('dashboard.noSelection.description')}</BodyText>
        </div>
      </div>
    );
  }

  const selectedChain = selectedChainId ? chains.find((c) => c.chainId === selectedChainId) : null;

  return (
    <div className={containerClass}>
      <FootnoteText className="text-text-tertiary">{t('dashboard.stakingOverview.title')}</FootnoteText>
      <TitleText className="mt-1">
        {pending ? <Skeleton width={30} height={7} /> : <Price amount={totalFiat ?? '0'} currency={currency} />}
      </TitleText>
      {totalActiveValidators !== undefined && totalActiveValidators > 0 && (
        <FootnoteText className="text-text-tertiary">
          {t('dashboard.stakingOverview.activeValidators', { count: totalActiveValidators })}
        </FootnoteText>
      )}

      {chains.length > 0 && (
        <>
          <div className="my-4 border-t border-divider" />
          <div className="flex gap-4">
            <ChainAllocationChart chains={chains} />
            <div className="flex flex-1 flex-col gap-3">
              {chains.map((chain) => {
                const { formatted, suffix } = formatBalance(chain.totalStaked, chain.precision);
                const hasUnstaking = new BigNumber(chain.totalUnstaking).gt(0);
                const hasRedeemable = new BigNumber(chain.totalRedeemable).gt(0);

                return (
                  <div key={chain.chainId}>
                    <div
                      className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1 hover:bg-hover"
                      onClick={() => setSelectedChainId(chain.chainId)}
                    >
                      <div className="flex items-center gap-2">
                        <img src={chain.icon.colored} alt={chain.chainName} className="h-6 w-6" />
                        <div>
                          <FootnoteText className="text-text-primary">{chain.chainName}</FootnoteText>
                          <FootnoteText className="text-text-tertiary">
                            {formatted}
                            {suffix ? ` ${suffix}` : ''} {chain.symbol}
                            {chain.activeValidatorCount !== undefined && chain.activeValidatorCount > 0 && (
                              <>
                                {' · '}
                                {t('dashboard.stakingOverview.activeValidators', {
                                  count: chain.activeValidatorCount,
                                })}
                              </>
                            )}
                          </FootnoteText>
                        </div>
                      </div>
                      <FootnoteText className="text-text-secondary">
                        <Price amount={chain.fiatValue} currency={currency} />
                      </FootnoteText>
                    </div>
                    {hasUnstaking && (
                      <div className="flex items-center justify-between pr-2 pl-10">
                        <FootnoteText className="text-text-tertiary">
                          {t('dashboard.stakingOverview.unstaking')}{' '}
                          {formatBalance(chain.totalUnstaking, chain.precision).formatted} {chain.symbol}
                        </FootnoteText>
                        <FootnoteText className="text-text-tertiary">
                          <Price amount={chain.unstakingFiatValue} currency={currency} />
                        </FootnoteText>
                      </div>
                    )}
                    {hasRedeemable && (
                      <div className="flex items-center justify-between pr-2 pl-10">
                        <FootnoteText className="text-text-positive">
                          {t('dashboard.stakingOverview.redeemable')}{' '}
                          {formatBalance(chain.totalRedeemable, chain.precision).formatted} {chain.symbol}
                        </FootnoteText>
                        <FootnoteText className="text-text-positive">
                          <Price amount={chain.redeemableFiatValue} currency={currency} />
                        </FootnoteText>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {!pending && chains.length === 0 && (
        <div className="flex flex-col items-center gap-y-1 py-6">
          <BodyText className="text-text-tertiary">{t('dashboard.stakingOverview.noStaking')}</BodyText>
        </div>
      )}

      {pending && chains.length === 0 && (
        <div className="my-4 flex flex-col gap-3">
          <Skeleton width="100%" height={40} />
          <Skeleton width="100%" height={40} />
        </div>
      )}

      {selectedChain && (
        <StakingDetailModal
          chainSummary={selectedChain}
          stakingData={stakingDataByChain[selectedChain.chainId] ?? {}}
          accountIds={accountIds}
          allEntries={allEntries}
          currency={currency}
          onClose={() => setSelectedChainId(null)}
        />
      )}
    </div>
  );
};
