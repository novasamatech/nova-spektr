import { useUnit } from 'effector-react';
import { useCallback, useMemo, useState } from 'react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatAsset } from '@/shared/lib/utils';
import { BodyText, FootnoteText, HelpText, SmallTitleText } from '@/shared/ui';
import { type SegmentedOption, Label, SegmentedControl, Skeleton, Tooltip } from '@/shared/ui-kit';
import { currencySelect } from '@/aggregates/currency-select';
import { DashboardWidget } from '@/pages/Dashboard';
import { useMinStakeRows } from '../hooks/useMinStakeRows';
import { useThresholdAssets } from '../hooks/useThresholdAssets';
import { CHART_MIN_HEIGHT, ERA_DEPTH, TOOLTIP_WIDTH } from '../lib/constants';
import { formatAxisValue, formatEraNumber, formatSignedPercent, formatSignedTokens } from '../lib/format';
import { buildWindow } from '../lib/scale';

import { type ChartHover, MinStakeStepChart } from './MinStakeStepChart';
import { MinStakeTooltip } from './MinStakeTooltip';

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

/**
 * "Minimum stake to enter the active set — past 7 eras", design variant 2C
 * ("era step line"). Network-level: the entry threshold is a fact about the
 * chain, so unlike every other card on the tab this one ignores the dashboard's
 * account picker entirely — an empty selection must not blank it.
 */
export const MinStakeWidget = () => {
  const { t, formatDate } = useI18n();
  const fiatFlag = useUnit(currencySelect.$fiatFlag);

  const assets = useThresholdAssets();
  const [pickedChainId, setPickedChainId] = useState<ChainId | null>(null);
  const [hover, setHover] = useState<ChartHover | null>(null);

  const selected = assets.find((asset) => asset.chainId === pickedChainId) ?? assets[0];
  const { rows, pending } = useMinStakeRows(selected?.chain ?? null, selected?.asset.precision ?? 0);

  const assetOptions = useMemo<SegmentedOption<ChainId>[]>(
    () => assets.map((asset) => ({ value: asset.chainId, label: asset.symbol })),
    [assets],
  );

  const handleAssetChange = useCallback((next: ChainId) => {
    setPickedChainId(next);
    setHover(null);
  }, []);

  const scaleWindow = useMemo(
    () => (rows && rows.length > 0 ? buildWindow(rows.map((row) => row.tokens)) : null),
    [rows],
  );

  if (!selected) return null;

  const current = rows?.at(-1);
  const first = rows?.[0];
  const hoveredRow = hover && rows ? rows[hover.index] : undefined;
  const tooltipLeft = hover ? clamp(hover.x - TOOLTIP_WIDTH / 2, 0, Math.max(hover.width - TOOLTIP_WIDTH, 0)) : 0;

  return (
    <DashboardWidget>
      <div className="flex min-h-full flex-col">
        {/* The toggle stays live in every state — it is built from configured
            chains, not from era data. */}
        <div className="flex items-center justify-between gap-4">
          <FootnoteText className="text-text-tertiary">{t('dashboard.staking.minStake.title')}</FootnoteText>
          <SegmentedControl
            value={selected.chainId}
            options={assetOptions}
            label={t('dashboard.staking.minStake.assetSwitch')}
            onChange={handleAssetChange}
          />
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          {pending ? (
            <Skeleton width="180px" height="22px" />
          ) : current && first ? (
            <>
              <SmallTitleText className="tabular-nums">{formatAsset(current.minStake, selected.asset)}</SmallTitleText>
              <FootnoteText className="text-text-tertiary">
                {t('dashboard.staking.minStake.headlineEra', { era: formatEraNumber(current.era) })}
              </FootnoteText>
              {current !== first && (
                <Tooltip>
                  <Tooltip.Trigger>
                    <span>
                      <Label variant={current.tokens >= first.tokens ? 'orange' : 'green'}>
                        {formatSignedPercent(current.tokens, first.tokens)}
                      </Label>
                    </span>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    {t('dashboard.staking.minStake.deltaTitle', {
                      delta: formatSignedTokens(current.tokens - first.tokens),
                      symbol: selected.symbol,
                      era: formatEraNumber(first.era),
                      eras: ERA_DEPTH,
                    })}
                  </Tooltip.Content>
                </Tooltip>
              )}
              <span className="flex-1" />
              <HelpText className="whitespace-nowrap text-text-tertiary">
                {t('dashboard.staking.minStake.validatorsPerEra', { validators: current.validatorCount })}
              </HelpText>
            </>
          ) : (
            <SmallTitleText className="text-text-tertiary">—</SmallTitleText>
          )}
        </div>

        <div className="relative mt-3 flex min-h-0 flex-1 flex-col" style={{ minHeight: CHART_MIN_HEIGHT }}>
          {pending ? (
            <Skeleton width="100%" height="100%" />
          ) : rows && rows.length > 0 && scaleWindow ? (
            <>
              <MinStakeStepChart
                rows={rows}
                scaleWindow={scaleWindow}
                hoveredIndex={hover?.index ?? null}
                formatDate={formatDate}
                onHoverChange={setHover}
              />
              {hoveredRow && hover && (
                <div className="absolute top-1 z-10" style={{ left: tooltipLeft }}>
                  <MinStakeTooltip
                    row={hoveredRow}
                    previous={rows[hover.index - 1]}
                    asset={selected.asset}
                    showFiat={fiatFlag}
                    formatDate={formatDate}
                  />
                </div>
              )}
            </>
          ) : (
            // The plot box keeps its height — the card never changes shape.
            <div className="flex flex-1 flex-col items-center justify-center gap-y-1 text-center">
              <BodyText className="text-text-tertiary">{t('dashboard.staking.minStake.empty.title')}</BodyText>
              <FootnoteText className="text-text-tertiary">
                {t('dashboard.staking.minStake.empty.description', {
                  chain: selected.chain.name,
                  eras: ERA_DEPTH,
                })}
              </FootnoteText>
            </div>
          )}
        </div>

        {scaleWindow && !pending && (
          <HelpText className="mt-2 text-text-tertiary">
            {t('dashboard.staking.minStake.zoomNote', {
              floor: formatAxisValue(scaleWindow.floor, scaleWindow.step),
              symbol: selected.symbol,
            })}
          </HelpText>
        )}
      </div>
    </DashboardWidget>
  );
};
