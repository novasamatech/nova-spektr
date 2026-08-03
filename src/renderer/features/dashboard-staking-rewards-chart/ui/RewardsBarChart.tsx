import { default as BigNumber } from 'bignumber.js';
import { useCallback, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { type MouseHandlerDataParam } from 'recharts/types/synchronisation/types';
import { type XAxisTickContentProps } from 'recharts/types/util/types';

import { type Asset } from '@/shared/core';
import { formatBalance } from '@/shared/lib/utils';
import { CHART_HEIGHT } from '../lib/constants';
import { type DateFormatter, formatAxisLabel } from '../lib/labels';
import { type RewardBucket } from '../lib/types';

const AXIS_COLOR = '#d9d9d9';
const GRID_COLOR = '#ededed';
const TICK_COLOR = '#8d93a5';
const LABEL_COLOR = '#4b4d5a';

type ChartDatum = {
  /** Bucket start — stable across re-renders, unlike the array index. */
  key: number;
  value: number;
  valueLabel: string;
  axisPrimary: string;
  axisSecondary: string | null;
};

type Props = {
  buckets: RewardBucket[];
  asset: Asset;
  color: string;
  formatDate: DateFormatter;
  onHoverChange: (hover: { index: number; x: number } | null) => void;
};

const renderNothing = () => null;

const AxisTick = ({ props, data }: { props: XAxisTickContentProps; data: ChartDatum[] }) => {
  const x = typeof props.x === 'number' ? props.x : 0;
  const y = typeof props.y === 'number' ? props.y : 0;
  const datum = props.payload ? data[props.payload.index] : undefined;

  if (!datum) return null;

  return (
    <g>
      <text x={x} y={y + 12} textAnchor="middle" fill={TICK_COLOR} fontSize={10}>
        {datum.axisPrimary}
      </text>
      {datum.axisSecondary ? (
        <text x={x} y={y + 24} textAnchor="middle" fill={TICK_COLOR} fontSize={9}>
          {datum.axisSecondary}
        </text>
      ) : null}
    </g>
  );
};

export const RewardsBarChart = ({ buckets, asset, color, formatDate, onHoverChange }: Props) => {
  const data = useMemo<ChartDatum[]>(() => {
    const divisor = new BigNumber(10).pow(asset.precision);

    return buckets.map((bucket, index) => {
      const axis = formatAxisLabel(bucket, index, formatDate);
      // The suffix is part of the number: `formatBalance` shortens a million to
      // `13.56` + `M`, so dropping it understates the bar by six orders.
      const { formatted, suffix } = formatBalance(bucket.total, asset.precision);

      return {
        key: bucket.start,
        value: new BigNumber(bucket.total).dividedBy(divisor).toNumber(),
        valueLabel: new BigNumber(bucket.total).isZero() ? '' : `${formatted}${suffix}`,
        axisPrimary: axis.primary,
        axisSecondary: axis.secondary,
      };
    });
  }, [buckets, asset.precision, formatDate]);

  const hasSecondaryTicks = data.some((datum) => datum.axisSecondary !== null);

  // Two faint rules across the plot, at a third and two thirds of the tallest
  // bar — enough to read a height against, few enough to stay quiet.
  const gridValues = useMemo(() => {
    const max = Math.max(...data.map((datum) => datum.value), 0);
    if (max <= 0) return [];

    return [max / 3, (max * 2) / 3];
  }, [data]);

  const handleMouseMove = useCallback(
    (next: MouseHandlerDataParam) => {
      const rawIndex = next.activeTooltipIndex;
      const index = typeof rawIndex === 'number' ? rawIndex : Number(rawIndex);

      if (!next.isTooltipActive || !Number.isInteger(index) || index < 0) {
        onHoverChange(null);

        return;
      }

      onHoverChange({ index, x: next.activeCoordinate?.x ?? 0 });
    },
    [onHoverChange],
  );

  const handleMouseLeave = useCallback(() => onHoverChange(null), [onHoverChange]);

  const renderTick = useCallback((props: XAxisTickContentProps) => <AxisTick props={props} data={data} />, [data]);

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 4, bottom: 0, left: 4 }}
        barCategoryGap="18%"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <CartesianGrid vertical={false} horizontalValues={gridValues} stroke={GRID_COLOR} />
        <YAxis hide domain={[0, 'dataMax']} />
        <XAxis
          dataKey="axisPrimary"
          tick={renderTick}
          tickLine={false}
          axisLine={{ stroke: AXIS_COLOR }}
          interval={buckets.length > 13 ? 'preserveStartEnd' : 0}
          height={hasSecondaryTicks ? 30 : 20}
        />
        {/*
          Recharts owns the hit-testing, but not the card: the hover band is
          drawn here while the card itself is rendered by the parent, which is
          the only place that knows the card's edges to clamp against.
        */}
        <Tooltip content={renderNothing} cursor={{ fill: 'rgba(0,0,0,0.04)', radius: 4 }} />
        {/*
          Every bar is labelled, on every range. The hover card carries the
          breakdown, never the only copy of the number - reading a value must
          not require pointing at it.

          `isAnimationActive={false}` is what keeps that promise. Recharts does
          not render a `LabelList` while its bar animation runs, and activating
          the tooltip re-runs that animation - so hovering blanked every label
          for ~300ms, and moving along the bars re-triggered it on each one. The
          grow-in is not worth numbers that flicker under the pointer.
        */}
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} isAnimationActive={false}>
          <LabelList dataKey="valueLabel" position="top" offset={6} fill={LABEL_COLOR} fontSize={10} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
