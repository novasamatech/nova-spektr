import { type MouseEvent, useCallback, useMemo, useRef } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { HelpText } from '@/shared/ui';
import { type MinStakeRow } from '../hooks/useMinStakeRows';
import { CHART_VALUE_SHARE, STEP_COLORS } from '../lib/constants';
import { formatAxisValue, formatEraValue } from '../lib/format';
import { type ScaleWindow, fractionOf } from '../lib/scale';

export type ChartHover = {
  index: number;
  /** Column centre in px, relative to the chart's own box. */
  x: number;
  /** Chart box width at the moment of the hover, for tooltip clamping. */
  width: number;
};

type Props = {
  rows: MinStakeRow[];
  window: ScaleWindow;
  hoveredIndex: number | null;
  formatDate: (date: Date | number, pattern: string) => string;
  onHoverChange: (hover: ChartHover | null) => void;
};

/** Internal SVG coordinate space; stretched to the box by the viewBox. */
const VIEW = 1000;

/** Width of the y-axis label strip. */
const AXIS_CLASS = 'w-10 shrink-0';

/**
 * The step line itself. A step per era — the threshold is constant inside an
 * era, so a curve through the points would draw a change that never happened.
 * Completed eras share one muted line; the active era's segment is re-drawn in
 * the accent on top, matching its dot and label.
 */
export const MinStakeStepChart = ({ rows, window, hoveredIndex, formatDate, onHoverChange }: Props) => {
  const boxRef = useRef<HTMLDivElement>(null);

  const geometry = useMemo(() => {
    const count = rows.length;
    const columnWidth = VIEW / count;
    const yOf = (row: MinStakeRow) => VIEW - fractionOf(window, row.tokens) * CHART_VALUE_SHARE * VIEW;

    const linePoints = rows
      .map((row, index) => {
        const y = yOf(row).toFixed(1);

        return `${(index * columnWidth).toFixed(1)},${y} ${((index + 1) * columnWidth).toFixed(1)},${y}`;
      })
      .join(' ');

    const last = rows.at(-1);
    const previous = rows.at(-2) ?? last;
    const activeX = (count - 1) * columnWidth;
    const activePoints =
      last === undefined || previous === undefined
        ? ''
        : `${activeX.toFixed(1)},${yOf(previous).toFixed(1)} ${activeX.toFixed(1)},${yOf(last).toFixed(1)} ${VIEW},${yOf(last).toFixed(1)}`;

    return {
      linePoints,
      areaPoints: `${linePoints} ${VIEW},${VIEW} 0,${VIEW}`,
      activePoints,
      columns: rows.map((row, index) => ({
        left: `${((index / count) * 100).toFixed(3)}%`,
        width: `${(100 / count).toFixed(3)}%`,
        bottom: `${(fractionOf(window, row.tokens) * CHART_VALUE_SHARE * 100).toFixed(2)}%`,
      })),
    };
  }, [rows, window]);

  const handleEnter = useCallback(
    (index: number) => (event: MouseEvent<HTMLDivElement>) => {
      const box = boxRef.current?.getBoundingClientRect();
      if (!box) return;

      const column = event.currentTarget.getBoundingClientRect();
      onHoverChange({ index, x: column.left - box.left + column.width / 2, width: box.width });
    },
    [onHoverChange],
  );

  const handleLeave = useCallback(() => onHoverChange(null), [onHoverChange]);

  return (
    <div ref={boxRef} className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 gap-2">
        {/* y-axis labels, aligned to the gridlines they describe */}
        <div className={cnTw(AXIS_CLASS, 'relative')}>
          {window.gridlines.map((line) => (
            <div
              key={line}
              className="absolute right-0 translate-y-1/2"
              style={{ bottom: `${(fractionOf(window, line) * CHART_VALUE_SHARE * 100).toFixed(2)}%` }}
            >
              <HelpText className="text-text-tertiary tabular-nums">{formatAxisValue(line, window.step)}</HelpText>
            </div>
          ))}
          <HelpText className="absolute right-0 -bottom-1 text-text-tertiary tabular-nums">
            {formatAxisValue(window.floor, window.step)}
          </HelpText>
        </div>

        <div className="relative min-w-0 flex-1 border-b border-divider">
          {window.gridlines.map((line) => (
            <div
              key={line}
              className="absolute inset-x-0 border-t border-divider"
              style={{ bottom: `${(fractionOf(window, line) * CHART_VALUE_SHARE * 100).toFixed(2)}%` }}
            />
          ))}

          <svg
            viewBox={`0 0 ${VIEW} ${VIEW}`}
            preserveAspectRatio="none"
            className="absolute inset-0 block h-full w-full"
          >
            <polygon points={geometry.areaPoints} fill={STEP_COLORS.area} opacity={0.7} />
            <polyline
              points={geometry.linePoints}
              fill="none"
              stroke={STEP_COLORS.line}
              strokeWidth={2}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <polyline
              points={geometry.activePoints}
              fill="none"
              stroke={STEP_COLORS.accent}
              strokeWidth={2.4}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {rows.map((row, index) => (
            <div
              key={row.era}
              className={cnTw('absolute inset-y-0 cursor-pointer', hoveredIndex === index && 'bg-icon-accent/5')}
              style={{ left: geometry.columns[index]?.left, width: geometry.columns[index]?.width }}
              onMouseEnter={handleEnter(index)}
              onMouseLeave={handleLeave}
            >
              <div
                className="absolute inset-x-0 text-center"
                style={{ bottom: `calc(${geometry.columns[index]?.bottom} + 9px)` }}
              >
                <HelpText
                  className={cnTw(
                    'font-semibold whitespace-nowrap tabular-nums',
                    row.isActive ? 'text-tab-text-accent' : 'text-text-secondary',
                  )}
                >
                  {formatEraValue(row.tokens)}
                </HelpText>
              </div>
              <span
                className="absolute left-1/2 box-border h-1.5 w-1.5 -translate-x-1/2 translate-y-1/2 rounded-full border-[1.6px]"
                style={{
                  bottom: geometry.columns[index]?.bottom,
                  backgroundColor: row.isActive ? STEP_COLORS.accent : '#fff',
                  borderColor: row.isActive ? STEP_COLORS.accent : STEP_COLORS.line,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* x labels — era number, plus the date only where it can be stated honestly */}
      <div className="mt-1.5 flex gap-2">
        <span className={AXIS_CLASS} />
        <div className="flex min-w-0 flex-1">
          {rows.map((row) => (
            <div key={row.era} className="min-w-0 flex-1 text-center leading-tight">
              <HelpText
                className={cnTw(
                  'block font-semibold tabular-nums',
                  row.isActive ? 'text-tab-text-accent' : 'text-text-secondary',
                )}
              >
                {row.era}
              </HelpText>
              {row.dateMs !== null && (
                <HelpText className="block text-text-tertiary">{formatDate(row.dateMs, 'MMM d')}</HelpText>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
