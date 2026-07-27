import { default as BigNumber } from 'bignumber.js';
import { useCallback, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { type MouseHandlerDataParam } from 'recharts/types/synchronisation/types';
import { type XAxisTickContentProps } from 'recharts/types/util/types';

import { type Asset } from '@/shared/core';
import { formatBalance } from '@/shared/lib/utils';
import { shouldShowValueLabels } from '../lib/buckets';
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
  activeIndex: number | null;
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

export const RewardsBarChart = ({ buckets, asset, color, activeIndex, formatDate, onHoverChange }: Props) => {
  const data = useMemo<ChartDatum[]>(() => {
    const divisor = new BigNumber(10).pow(asset.precision);

    return buckets.map((bucket, index) => {
      const axis = formatAxisLabel(bucket, index, formatDate);
      const { formatted } = formatBalance(bucket.total, asset.precision);

      return {
        key: bucket.start,
        value: new BigNumber(bucket.total).dividedBy(divisor).toNumber(),
        valueLabel: new BigNumber(bucket.total).isZero() ? '' : formatted,
        axisPrimary: axis.primary,
        axisSecondary: axis.secondary,
      };
    });
  }, [buckets, asset.precision, formatDate]);

  const showLabels = shouldShowValueLabels(buckets.length);
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
        margin={{ top: showLabels ? 20 : 8, right: 4, bottom: 0, left: 4 }}
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
        <Bar dataKey="value" radius={[4, 4, 0, 0]} animationDuration={400}>
          {data.map((datum, index) => (
            <Cell
              key={datum.key}
              fill={color}
              // Without value labels the hovered bar has to stand out on its own.
              fillOpacity={!showLabels && activeIndex !== null && activeIndex !== index ? 0.3 : 1}
            />
          ))}
          {showLabels ? (
            <LabelList dataKey="valueLabel" position="top" offset={6} fill={LABEL_COLOR} fontSize={10} />
          ) : null}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
