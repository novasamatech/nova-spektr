import { useState } from 'react';
import { type LabelProps, Bar, BarChart, ResponsiveContainer, XAxis } from 'recharts';
import { type BarShapeProps } from 'recharts/types/cartesian/Bar';
import { type XAxisTickContentProps } from 'recharts/types/util/types';

import { useI18n } from '@/shared/i18n';
import { formatFiatBalance } from '@/shared/lib/utils';
import { BodyText, FootnoteText, SmallTitleText } from '@/shared/ui';
import { Skeleton } from '@/shared/ui-kit';
import { type MonthlyBarData, useMonthlyRewardsChart } from '../hooks/useMonthlyRewardsChart';
import { type EntryLike } from '../hooks/useStakingBreakdown';

type Props = {
  accountIds: string[];
  allEntries: EntryLike[];
};

type ChainMode = 'dot' | 'ksm';

const DOT_GRADIENT_ID = 'monthlyDotGradient';
const DOT_PEAK_GRADIENT_ID = 'monthlyDotPeakGradient';
const KSM_GRADIENT_ID = 'monthlyKsmGradient';
const KSM_PEAK_GRADIENT_ID = 'monthlyKsmPeakGradient';

const pillContainerClass = 'flex rounded-md bg-tab-background p-0.5';
const pillButtonClass = 'rounded px-3 py-1 text-footnote font-semibold transition-colors cursor-pointer';
const pillActiveClass = 'shadow-sm text-white';
const pillInactiveClass = 'text-text-tertiary hover:text-text-secondary';

const containerClass = 'w-full rounded-lg border border-token-container-border bg-white p-4 shadow-card-shadow';

// Recharts render-prop callbacks receive arbitrary props — runtime guards used instead of `as` casts
const DualLabel = (props: LabelProps & { data?: MonthlyBarData[] }) => {
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
};

const XAxisTick = (props: XAxisTickContentProps & { data?: MonthlyBarData[] }) => {
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
};

// Skeleton height is in Tailwind grid units (×4px), so 15 = 60px, 35 = 140px
const SKELETON_HEIGHTS = [15, 22, 30, 19, 35, 28, 21, 24, 32, 25, 29, 26];

export const MonthlyRewardsWidget = ({ accountIds }: Props) => {
  const { t } = useI18n();
  const [mode, setMode] = useState<ChainMode>('dot');
  const { dotBars, ksmBars, dotTotal, ksmTotal, pending, fiatFlag, currency } = useMonthlyRewardsChart(accountIds);

  if (!fiatFlag) return null;

  const bars = mode === 'dot' ? dotBars : ksmBars;
  const total = mode === 'dot' ? dotTotal : ksmTotal;
  const gradientId = mode === 'dot' ? DOT_GRADIENT_ID : KSM_GRADIENT_ID;
  const peakGradientId = mode === 'dot' ? DOT_PEAK_GRADIENT_ID : KSM_PEAK_GRADIENT_ID;

  if (accountIds.length === 0) {
    return (
      <div className={containerClass}>
        <FootnoteText className="text-text-tertiary">{t('dashboard.monthlyRewards.title')}</FootnoteText>
        <div className="flex flex-col items-center gap-y-1 py-6">
          <SmallTitleText className="text-text-tertiary">{t('dashboard.noSelection.title')}</SmallTitleText>
          <BodyText className="text-text-tertiary">{t('dashboard.noSelection.description')}</BodyText>
        </div>
      </div>
    );
  }

  const fiatTotal = currency?.symbol
    ? `${currency.symbol}${formatFiatBalance(total.fiat).formatted}`
    : formatFiatBalance(total.fiat).formatted;

  return (
    <div className={containerClass}>
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
            onClick={() => setMode('dot')}
          >
            {t('dashboard.monthlyRewards.dot')}
          </button>
          <button
            type="button"
            className={`${pillButtonClass} ${mode === 'ksm' ? `${pillActiveClass} bg-[#222]` : pillInactiveClass}`}
            onClick={() => setMode('ksm')}
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
              <defs>
                <linearGradient id={DOT_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e6007a" />
                  <stop offset="100%" stopColor="#8a0048" />
                </linearGradient>
                <linearGradient id={DOT_PEAK_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff1a8c" />
                  <stop offset="40%" stopColor="#e6007a" />
                  <stop offset="100%" stopColor="#8a0048" />
                </linearGradient>
                <linearGradient id={KSM_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#555" />
                  <stop offset="100%" stopColor="#1a1a1a" />
                </linearGradient>
                <linearGradient id={KSM_PEAK_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#888" />
                  <stop offset="40%" stopColor="#555" />
                  <stop offset="100%" stopColor="#1a1a1a" />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={(tickProps: XAxisTickContentProps) => <XAxisTick {...tickProps} data={bars} />}
                height={32}
              />
              <Bar
                dataKey="rawAmount"
                radius={[4, 4, 1, 1]}
                animationDuration={600}
                minPointSize={8}
                label={(labelProps: LabelProps) => <DualLabel {...labelProps} data={bars} />}
                shape={(shapeProps: BarShapeProps) => {
                  const x = typeof shapeProps.x === 'number' ? shapeProps.x : 0;
                  const y = typeof shapeProps.y === 'number' ? shapeProps.y : 0;
                  const w = typeof shapeProps.width === 'number' ? shapeProps.width : 0;
                  const h = typeof shapeProps.height === 'number' ? shapeProps.height : 0;
                  const idx = typeof shapeProps.index === 'number' ? shapeProps.index : -1;
                  const bar = idx >= 0 ? bars[idx] : undefined;
                  const fill = bar?.isPeak ? `url(#${peakGradientId})` : `url(#${gradientId})`;

                  return <rect x={x} y={y} width={w} height={h} rx={4} ry={4} fill={fill} />;
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center gap-y-1 py-6">
            <BodyText className="text-text-tertiary">{t('dashboard.monthlyRewards.noData')}</BodyText>
          </div>
        )}
      </div>
    </div>
  );
};
