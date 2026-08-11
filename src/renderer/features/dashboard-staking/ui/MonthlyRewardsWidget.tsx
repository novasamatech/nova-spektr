import { type ReactNode, memo, useCallback, useState } from 'react';
import { type LabelProps, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { type BarShapeProps } from 'recharts/types/cartesian/Bar';
import { type XAxisTickContentProps } from 'recharts/types/util/types';

import { useI18n } from '@/shared/i18n';
import { formatFiatBalance, toAccountId } from '@/shared/lib/utils';
import { BodyText, FootnoteText, SmallTitleText } from '@/shared/ui';
import { Skeleton } from '@/shared/ui-kit';
import { useAccountName } from '@/domains/network';
import { DashboardWidget } from '@/pages/Dashboard';
import { type ChainMode, type MonthlyBarData, useMonthlyRewardsChart } from '../hooks/useMonthlyRewardsChart';
import { type EntryLike } from '../hooks/useStakingBreakdown';

type Props = {
  accountIds: string[];
  allEntries: EntryLike[];
};

const pillContainerClass = 'flex rounded-md bg-tab-background p-0.5';
const pillButtonClass = 'rounded px-3 py-1 text-footnote font-semibold transition-colors cursor-pointer';
const pillActiveClass = 'shadow-sm text-white';
const pillInactiveClass = 'text-text-tertiary hover:text-text-secondary';

const DualLabel = memo((props: LabelProps & { data?: MonthlyBarData[] }) => {
  const x = typeof props.x === 'number' ? props.x : 0;
  const y = typeof props.y === 'number' ? props.y : 0;
  const width = typeof props.width === 'number' ? props.width : 0;
  const index = typeof props.index === 'number' ? props.index : -1;
  const allBars = Array.isArray(props.data) ? props.data : null;

  if (!allBars || index < 0) return null;

  const bar = allBars[index];
  if (!bar) return null;

  const cx = x + width / 2;

  return (
    <g>
      <text x={cx} y={y - 22} textAnchor="middle" fill="#888" fontSize={10}>
        {bar.fiatAmount}
      </text>
      <text
        x={cx}
        y={y - 6}
        textAnchor="middle"
        fill={bar.isPeak ? '#e6007a' : '#b0b0b0'}
        fontSize={11}
        fontWeight={bar.isPeak ? 700 : 600}
      >
        {bar.tokenAmount}
      </text>
    </g>
  );
});

const XAxisTick = memo((props: XAxisTickContentProps & { data?: MonthlyBarData[] }) => {
  const x = typeof props.x === 'number' ? props.x : 0;
  const y = typeof props.y === 'number' ? props.y : 0;
  const payload = props.payload ?? null;
  const allBars = Array.isArray(props.data) ? props.data : null;

  if (!allBars || !payload) return null;

  const bar = allBars[payload.index];
  if (!bar) return null;

  const showYear = payload.index === 0 || bar.month === 'Jan';

  return (
    <g>
      <text x={x} y={y + 12} textAnchor="middle" fill="#888" fontSize={10}>
        {bar.month}
      </text>
      {showYear && (
        <text x={x} y={y + 24} textAnchor="middle" fill="#666" fontSize={9}>
          {bar.year}
        </text>
      )}
    </g>
  );
});

const TooltipRow = memo(({ accountId, value, color }: { accountId: string; value: number; color?: string }) => {
  const name = useAccountName({ accountId: toAccountId(accountId) });

  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
      <span className="text-help-text text-text-secondary">
        {name || `${accountId.slice(0, 6)}…${accountId.slice(-4)}`}
      </span>
      <span className="ml-auto pl-3 text-help-text font-semibold text-text-primary">{value.toFixed(2)}</span>
    </div>
  );
});

const R = 8;

const StackedShape = memo(({ barProps, barData }: { barProps: BarShapeProps; barData: MonthlyBarData[] }) => {
  const x = typeof barProps.x === 'number' ? barProps.x : 0;
  const y = typeof barProps.y === 'number' ? barProps.y : 0;
  const w = typeof barProps.width === 'number' ? barProps.width : 0;
  const h = typeof barProps.height === 'number' ? barProps.height : 0;
  const idx = typeof barProps.index === 'number' ? barProps.index : -1;

  if (h <= 0 || idx < 0) return null;

  const entry = barData[idx];
  if (!entry || entry.segments.length === 0) return null;

  const clipId = `bar-clip-${idx}`;
  const r = Math.min(R, h / 2, w / 2);

  const rects: ReactNode[] = [];
  let offsetY = 0;

  for (let i = 0; i < entry.segments.length; i++) {
    const seg = entry.segments[i]!;
    const segH =
      i === entry.segments.length - 1 ? h - offsetY : Math.min(Math.max(Math.round(seg.fraction * h), 2), h - offsetY);

    if (segH <= 0) break;

    const segY = y + h - offsetY - segH;
    rects.push(<rect key={i} x={x} y={segY} width={w} height={segH} fill={seg.color} />);
    offsetY += segH;
  }

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect x={x} y={y} width={w} height={h} rx={r} ry={r} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>{rects}</g>
    </g>
  );
});

// Skeleton height is in Tailwind grid units (×4px), so 15 = 60px, 35 = 140px
const SKELETON_HEIGHTS = [15, 22, 30, 19, 35, 28, 21, 24, 32, 25, 29, 26];

/**
 * @deprecated Superseded by `features/dashboard-staking-rewards-chart`. No
 *   longer injected into any slot — kept only until the staking tab migration
 *   is finished. See the note in `features/dashboard-staking/index.ts`.
 */
export const MonthlyRewardsWidget = ({ accountIds, allEntries }: Props) => {
  const { t } = useI18n();
  const [mode, setMode] = useState<ChainMode>('dot');
  const { dotBars, ksmBars, dotTotal, ksmTotal, pending, fiatFlag, currency } = useMonthlyRewardsChart(
    accountIds,
    allEntries,
  );

  const bars = mode === 'dot' ? dotBars : ksmBars;
  const total = mode === 'dot' ? dotTotal : ksmTotal;

  const handleSetDot = useCallback(() => setMode('dot'), []);
  const handleSetKsm = useCallback(() => setMode('ksm'), []);

  const renderShape = useCallback(
    (shapeProps: BarShapeProps) => <StackedShape barProps={shapeProps} barData={bars} />,
    [bars],
  );

  const renderLabel = useCallback((labelProps: LabelProps) => <DualLabel {...labelProps} data={bars} />, [bars]);

  const renderTick = useCallback(
    (tickProps: XAxisTickContentProps) => <XAxisTick {...tickProps} data={bars} />,
    [bars],
  );

  if (!fiatFlag) return null;

  if (accountIds.length === 0) {
    return (
      <DashboardWidget className="relative">
        <FootnoteText className="text-text-tertiary">{t('dashboard.monthlyRewards.title')}</FootnoteText>
        <div className="flex flex-col items-center gap-y-1 py-6">
          <SmallTitleText className="text-text-tertiary">{t('dashboard.noSelection.title')}</SmallTitleText>
          <BodyText className="text-text-tertiary">{t('dashboard.noSelection.description')}</BodyText>
        </div>
      </DashboardWidget>
    );
  }

  const fiatTotal = currency?.symbol
    ? `${currency.symbol}${formatFiatBalance(total.fiat).formatted}`
    : formatFiatBalance(total.fiat).formatted;

  return (
    <DashboardWidget className="relative">
      <div className="flex items-start justify-between">
        <div>
          <FootnoteText className="text-text-tertiary">{t('dashboard.monthlyRewards.title')}</FootnoteText>
          <div className="mt-1 flex items-baseline gap-2">
            {pending ? (
              <Skeleton width={40} height={7} />
            ) : (
              <>
                <SmallTitleText>
                  {total.token} {total.symbol}
                </SmallTitleText>
                <FootnoteText className="text-text-tertiary">≈ {fiatTotal}</FootnoteText>
              </>
            )}
          </div>
        </div>
        <div className={pillContainerClass}>
          <button
            type="button"
            className={`${pillButtonClass} ${mode === 'dot' ? `${pillActiveClass} bg-[#e6007a]` : pillInactiveClass}`}
            onClick={handleSetDot}
          >
            {t('dashboard.monthlyRewards.dot')}
          </button>
          <button
            type="button"
            className={`${pillButtonClass} ${mode === 'ksm' ? `${pillActiveClass} bg-[#222]` : pillInactiveClass}`}
            onClick={handleSetKsm}
          >
            {t('dashboard.monthlyRewards.ksm')}
          </button>
        </div>
      </div>

      <div className="mt-4">
        {pending && bars.length === 0 ? (
          <div className="flex items-end gap-2" style={{ height: 200 }}>
            {SKELETON_HEIGHTS.map((h, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={i} className="flex-1">
                <Skeleton width="100%" height={h} />
              </div>
            ))}
          </div>
        ) : bars.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bars} margin={{ top: 45, right: 4, bottom: 8, left: 4 }} barCategoryGap="12%">
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={renderTick} height={32} />
              <Tooltip
                content={({ active, label }) => {
                  if (!active || typeof label !== 'string') return null;
                  const idx = bars.findIndex((b) => b.month === label);
                  const items = idx >= 0 ? bars[idx]?.segments : undefined;
                  if (!items?.length) return null;

                  return (
                    <div className="rounded-lg border border-token-container-border bg-white px-3 py-2 shadow-card-shadow">
                      {items.map((item, j) => (
                        // eslint-disable-next-line react/no-array-index-key
                        <TooltipRow key={j} accountId={item.accountId} value={item.value} color={item.color} />
                      ))}
                    </div>
                  );
                }}
                cursor={{ fill: 'rgba(0,0,0,0.04)', radius: 4 }}
                allowEscapeViewBox={{ x: true, y: true }}
                wrapperStyle={{ zIndex: 10 }}
              />
              <Bar
                dataKey="rawTotal"
                radius={[R, R, 0, 0]}
                animationDuration={600}
                label={renderLabel}
                shape={renderShape}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center gap-y-1 py-6">
            <BodyText className="text-text-tertiary">{t('dashboard.monthlyRewards.noData')}</BodyText>
          </div>
        )}
      </div>
    </DashboardWidget>
  );
};
