import { useState } from 'react';
import { type LabelProps, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { type XAxisTickContentProps } from 'recharts/types/util/types';

import { useI18n } from '@/shared/i18n';
import { formatFiatBalance, toAccountId } from '@/shared/lib/utils';
import { BodyText, FootnoteText, SmallTitleText } from '@/shared/ui';
import { FALLBACK_COLORS } from '@/shared/ui/chart-constants';
import { Skeleton } from '@/shared/ui-kit';
import { useAccountName } from '@/domains/network';
import { type MonthlyBarData, useMonthlyRewardsChart } from '../hooks/useMonthlyRewardsChart';
import { type EntryLike } from '../hooks/useStakingBreakdown';

type Props = {
  accountIds: string[];
  allEntries: EntryLike[];
};

type ChainMode = 'dot' | 'ksm';

const DOT_COLORS = ['#e6007a', '#ff4da6', '#cc006c', '#b30060', '#ff80c0', '#990052', '#ff1a8c', '#d40071'];
const KSM_COLORS = ['#333', '#555', '#222', '#444', '#666', '#1a1a1a', '#777', '#111'];

const pillContainerClass = 'flex rounded-md bg-tab-background p-0.5';
const pillButtonClass = 'rounded px-3 py-1 text-footnote font-semibold transition-colors cursor-pointer';
const pillActiveClass = 'shadow-sm text-white';
const pillInactiveClass = 'text-text-tertiary hover:text-text-secondary';

const containerClass = 'w-full rounded-lg border border-token-container-border bg-white p-4 shadow-card-shadow';

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

type StackTooltipProps = {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: readonly Record<string, any>[];
};

const TooltipRow = ({ accountId, value, color }: { accountId: string; value: number; color?: string }) => {
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
};

const StackTooltip = ({ active, payload }: StackTooltipProps) => {
  if (!active || !payload?.length) return null;

  const items = payload.filter((p) => typeof p.value === 'number' && p.value > 0).reverse();

  if (items.length <= 1) return null;

  return (
    <div className="rounded-lg border border-token-container-border bg-white px-3 py-2 shadow-card-shadow">
      {items.map((item, i) => (
        <TooltipRow
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          accountId={String(item.dataKey ?? item.name ?? '')}
          value={typeof item.value === 'number' ? item.value : 0}
          color={item.color}
        />
      ))}
    </div>
  );
};

// Skeleton height is in Tailwind grid units (×4px), so 15 = 60px, 35 = 140px
const SKELETON_HEIGHTS = [15, 22, 30, 19, 35, 28, 21, 24, 32, 25, 29, 26];

const getAccountColor = (index: number, mode: ChainMode): string => {
  const palette = mode === 'dot' ? DOT_COLORS : KSM_COLORS;

  return palette[index % palette.length] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length] ?? '#888';
};

export const MonthlyRewardsWidget = ({ accountIds, allEntries }: Props) => {
  const { t } = useI18n();
  const [mode, setMode] = useState<ChainMode>('dot');
  const { dotBars, ksmBars, dotAccounts, ksmAccounts, dotTotal, ksmTotal, pending, fiatFlag, currency } =
    useMonthlyRewardsChart(accountIds, allEntries);

  if (!fiatFlag) return null;

  const bars = mode === 'dot' ? dotBars : ksmBars;
  const accounts = mode === 'dot' ? dotAccounts : ksmAccounts;
  const total = mode === 'dot' ? dotTotal : ksmTotal;

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
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={(tickProps: XAxisTickContentProps) => <XAxisTick {...tickProps} data={bars} />}
                height={32}
              />
              <Tooltip
                content={({ active, payload }) => <StackTooltip active={active} payload={payload ?? undefined} />}
                cursor={{ fill: 'rgba(0,0,0,0.04)', radius: 4 }}
              />
              {accounts.map((account, i) => {
                const isLast = i === accounts.length - 1;
                const color = getAccountColor(i, mode);

                return (
                  <Bar
                    key={account.dataKey}
                    dataKey={account.dataKey}
                    stackId="rewards"
                    fill={color}
                    radius={isLast ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    animationDuration={600}
                    minPointSize={isLast ? 8 : 0}
                    label={isLast ? (labelProps: LabelProps) => <DualLabel {...labelProps} data={bars} /> : undefined}
                  />
                );
              })}
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
