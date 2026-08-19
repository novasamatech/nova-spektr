import { useUnit } from 'effector-react';
import { useCallback, useMemo, useRef, useState } from 'react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatAsset } from '@/shared/lib/utils';
import { BodyText, FootnoteText, SmallTitleText } from '@/shared/ui';
import { Skeleton } from '@/shared/ui-kit';
import { currencySelect } from '@/aggregates/currency-select';
import { AssetFiatBalance } from '@/widgets/price';
import { DashboardWidget } from '@/pages/Dashboard';
import { useRewardAssets } from '../hooks/useRewardAssets';
import { useRewardsChart } from '../hooks/useRewardsChart';
import { useRewardsEraAnchor } from '../hooks/useRewardsEraAnchor';
import { useWalletByAccountId } from '../hooks/useWalletByAccountId';
import { DEFAULT_RANGE, RANGE_KEYS } from '../lib/buckets';
import { CHART_HEIGHT, TOOLTIP_WIDTH } from '../lib/constants';
import { resolveBucketEra } from '../lib/era';
import { type RangeKey } from '../lib/types';

import { RewardsBarChart } from './RewardsBarChart';
import { RewardsChartTooltip } from './RewardsChartTooltip';
import { type SegmentedOption, SegmentedControl } from './SegmentedControl';

type EntryLike = { accountId: string; name: string; address: string };

type Props = {
  accountIds: string[];
  allEntries: EntryLike[];
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export const RewardsChartWidget = ({ accountIds }: Props) => {
  const { t, formatDate } = useI18n();
  const fiatFlag = useUnit(currencySelect.$fiatFlag);

  const assets = useRewardAssets();
  const walletByAccountId = useWalletByAccountId();

  const [range, setRange] = useState<RangeKey>(DEFAULT_RANGE);
  const [pickedChainId, setPickedChainId] = useState<ChainId | null>(null);
  // The plot width is captured with the hover rather than observed: it is only
  // ever needed to clamp the card that the same event opens.
  const [hover, setHover] = useState<{ index: number; x: number; width: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const handleHoverChange = useCallback((next: { index: number; x: number } | null) => {
    setHover(next ? { ...next, width: containerRef.current?.clientWidth ?? 0 } : null);
  }, []);

  // Until the user picks, open on the network they actually stake on — a chart
  // that defaults to an empty asset reads as "no rewards" when there are some.
  const selected =
    assets.find((asset) => asset.chainId === pickedChainId) ?? assets.find((asset) => asset.hasPosition) ?? assets[0];

  const chain = selected?.chain ?? null;
  const eraAnchor = useRewardsEraAnchor(chain);
  const { buckets, total, hasData, pending } = useRewardsChart({ accountIds, chain, range });

  const assetOptions = useMemo<SegmentedOption<ChainId>[]>(
    () => assets.map((asset) => ({ value: asset.chainId, label: asset.symbol, dotColor: asset.color })),
    [assets],
  );

  const rangeOptions = useMemo<SegmentedOption<RangeKey>[]>(
    () => RANGE_KEYS.map((key) => ({ value: key, label: t(`dashboard.staking.rewardsChart.range.${key}`) })),
    [t],
  );

  const handleRangeChange = useCallback((next: RangeKey) => {
    setRange(next);
    setHover(null);
  }, []);

  const handleAssetChange = useCallback((next: ChainId) => {
    setPickedChainId(next);
    setHover(null);
  }, []);

  const hoveredBucket = hover ? buckets[hover.index] : undefined;

  if (!selected || !chain) return null;

  // Centred on the bar, then pulled back inside the card so a first or last bar
  // never pushes the card past the edge.
  const tooltipLeft = hover ? clamp(hover.x - TOOLTIP_WIDTH / 2, 0, Math.max(hover.width - TOOLTIP_WIDTH, 0)) : 0;

  return (
    <DashboardWidget>
      {/* min-h-full lets the plot area absorb extra cell height while keeping
          the outer scroll when the cell is shorter than the content */}
      <div className="flex min-h-full flex-col">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FootnoteText className="text-text-tertiary">{t('dashboard.staking.rewardsChart.title')}</FootnoteText>
            <SegmentedControl
              value={selected.chainId}
              options={assetOptions}
              label={t('dashboard.staking.rewardsChart.assetSwitch')}
              onChange={handleAssetChange}
            />
          </div>
          <SegmentedControl
            value={range}
            options={rangeOptions}
            label={t('dashboard.staking.rewardsChart.rangeSwitch')}
            onChange={handleRangeChange}
          />
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          {pending ? (
            <Skeleton width="180px" height="22px" />
          ) : (
            <>
              <SmallTitleText>{formatAsset(total, selected.asset)}</SmallTitleText>
              <div className="flex items-baseline gap-1">
                {fiatFlag ? (
                  <>
                    {}
                    <FootnoteText className="text-text-tertiary">≈</FootnoteText>
                    <AssetFiatBalance asset={selected.asset} amount={total} />
                    {}
                    <FootnoteText className="text-text-tertiary">·</FootnoteText>
                  </>
                ) : null}
                <FootnoteText className="text-text-tertiary">
                  {t(`dashboard.staking.rewardsChart.rangeSummary.${range}`)}
                </FootnoteText>
              </div>
            </>
          )}
        </div>

        <div ref={containerRef} className="relative mt-3 min-h-0 flex-1" style={{ minHeight: CHART_HEIGHT }}>
          {/* The plot is absolutely positioned: the container's height comes
              from flex + min-height, which is not a definite height, so an
              in-flow percentage-sized chart would resolve to 0. */}
          <div className="absolute inset-0">
            {pending ? (
              <Skeleton width="100%" height="100%" />
            ) : hasData ? (
              <RewardsBarChart
                buckets={buckets}
                asset={selected.asset}
                color={selected.color}
                formatDate={formatDate}
                onHoverChange={handleHoverChange}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-y-1">
                <BodyText className="text-text-tertiary">{t('dashboard.staking.rewardsChart.empty.title')}</BodyText>
                <FootnoteText className="text-text-tertiary">
                  {t('dashboard.staking.rewardsChart.empty.description')}
                </FootnoteText>
              </div>
            )}
          </div>

          {hoveredBucket ? (
            <div className="absolute top-1 z-10" style={{ left: tooltipLeft }}>
              <RewardsChartTooltip
                bucket={hoveredBucket}
                chain={chain}
                asset={selected.asset}
                color={selected.color}
                era={resolveBucketEra(hoveredBucket, eraAnchor)}
                walletByAccountId={walletByAccountId}
                formatDate={formatDate}
              />
            </div>
          ) : null}
        </div>
      </div>
    </DashboardWidget>
  );
};
