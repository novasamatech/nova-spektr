import { type MouseEvent, memo, useCallback, useMemo, useRef } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { HelpText } from '@/shared/ui';
import { type MinStakeRow } from '../hooks/useMinStakeRows';
import {
  CHART_VALUE_SHARE,
  ERA_DATE_FORMAT,
  MAX_AXIS_LABELS,
  MAX_DOTTED_ERAS,
  MAX_LABELLED_ERAS,
  STEP_COLORS,
  VALUE_LABEL_OFFSET_PX,
} from '../lib/constants';
import { formatAxisValue, formatEraNumber, formatEraValue } from '../lib/format';
import { type AxisMode } from '../lib/range';
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
  scaleWindow: ScaleWindow;
  axisMode: AxisMode;
  hoveredIndex: number | null;
  formatDate: (date: Date | number, pattern: string) => string;
  onHoverChange: (hover: ChartHover | null) => void;
};

/** Internal SVG coordinate space; stretched to the box by the viewBox. */
const VIEW = 1000;

/** Width of the y-axis label strip. */
const AXIS_CLASS = 'w-10 shrink-0';

const percent = (fraction: number): string => `${(fraction * 100).toFixed(2)}%`;

/**
 * The step line itself. A step per era — the threshold is constant inside an
 * era, so a curve through the points would draw a change that never happened.
 * Completed eras share one muted line; the active era's segment is re-drawn in
 * the accent on top, matching its dot and label.
 *
 * Hover is one `mousemove` on the plot box that maps the pointer to a column
 * and reports only when the column changes — per-column enter/leave handlers
 * fired a state update for every pixel crossed between two labels.
 *
 * Hand-rolled SVG rather than Recharts (which the rewards chart uses): the
 * design draws full-column plateaus with the dot and label at the column's
 * centre, which Recharts' `stepAfter` interpolation cannot produce, and the
 * active era needs its own stroke laid over the shared line.
 */
export const MinStakeStepChart = memo(
  ({ rows, scaleWindow, axisMode, hoveredIndex, formatDate, onHoverChange }: Props) => {
    const boxRef = useRef<HTMLDivElement>(null);
    const count = rows.length;

    const geometry = useMemo(() => {
      const columnWidth = VIEW / count;
      const yOf = (row: MinStakeRow) => VIEW - fractionOf(scaleWindow, row.tokens) * CHART_VALUE_SHARE * VIEW;

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
          left: percent(index / count),
          width: percent(1 / count),
          bottom: percent(fractionOf(scaleWindow, row.tokens) * CHART_VALUE_SHARE),
        })),
      };
    }, [rows, scaleWindow, count]);

    const showValueLabels = count <= MAX_LABELLED_ERAS;
    const showDots = count <= MAX_DOTTED_ERAS;
    // Every n-th x label, the active era always included.
    const labelStride = Math.max(1, Math.ceil(count / MAX_AXIS_LABELS));

    const handleMove = useCallback(
      (event: MouseEvent<HTMLDivElement>) => {
        const box = boxRef.current?.getBoundingClientRect();
        if (!box || box.width === 0) return;

        const index = Math.min(Math.floor(((event.clientX - box.left) / box.width) * count), count - 1);
        if (index < 0 || index === hoveredIndex) return;

        onHoverChange({ index, x: ((index + 0.5) / count) * box.width, width: box.width });
      },
      [count, hoveredIndex, onHoverChange],
    );

    const handleLeave = useCallback(() => onHoverChange(null), [onHoverChange]);

    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 gap-2">
          {/* y-axis labels, aligned to the gridlines they describe */}
          <div className={cnTw(AXIS_CLASS, 'relative')}>
            {scaleWindow.gridlines.map((line) => (
              <div
                key={line}
                className="absolute right-0 translate-y-1/2"
                style={{ bottom: percent(fractionOf(scaleWindow, line) * CHART_VALUE_SHARE) }}
              >
                <HelpText className="text-text-tertiary tabular-nums">
                  {formatAxisValue(line, scaleWindow.step)}
                </HelpText>
              </div>
            ))}
            <HelpText className="absolute right-0 -bottom-1 text-text-tertiary tabular-nums">
              {formatAxisValue(scaleWindow.floor, scaleWindow.step)}
            </HelpText>
          </div>

          <div
            ref={boxRef}
            className="relative min-w-0 flex-1 cursor-crosshair border-b border-divider"
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
          >
            {scaleWindow.gridlines.map((line) => (
              <div
                key={line}
                className="absolute inset-x-0 border-t border-divider"
                style={{ bottom: percent(fractionOf(scaleWindow, line) * CHART_VALUE_SHARE) }}
              />
            ))}

            {hoveredIndex !== null && (
              <div
                className="absolute inset-y-0 bg-icon-accent/5"
                style={{ left: geometry.columns[hoveredIndex]?.left, width: geometry.columns[hoveredIndex]?.width }}
              />
            )}

            <svg
              viewBox={`0 0 ${VIEW} ${VIEW}`}
              preserveAspectRatio="none"
              className="absolute inset-0 block h-full w-full"
            >
              {/* var() resolves in CSS properties only, never in presentation
                  attributes — token-based paints go through style. */}
              <polygon points={geometry.areaPoints} style={{ fill: STEP_COLORS.area }} opacity={0.7} />
              <polyline
                points={geometry.linePoints}
                fill="none"
                style={{ stroke: STEP_COLORS.line }}
                strokeWidth={2}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              <polyline
                points={geometry.activePoints}
                fill="none"
                style={{ stroke: STEP_COLORS.accent }}
                strokeWidth={2.4}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {rows.map((row, index) => (
              <div
                key={row.era}
                className="pointer-events-none absolute inset-y-0"
                style={{ left: geometry.columns[index]?.left, width: geometry.columns[index]?.width }}
              >
                {showValueLabels && (
                  <div
                    className="absolute inset-x-0 text-center"
                    style={{ bottom: `calc(${geometry.columns[index]?.bottom} + ${VALUE_LABEL_OFFSET_PX}px)` }}
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
                )}
                {(showDots || row.isActive) && (
                  <span
                    className="absolute left-1/2 box-border h-1.5 w-1.5 -translate-x-1/2 translate-y-1/2 rounded-full border-[1.6px]"
                    style={{
                      bottom: geometry.columns[index]?.bottom,
                      backgroundColor: row.isActive ? STEP_COLORS.accent : STEP_COLORS.dotFill,
                      borderColor: row.isActive ? STEP_COLORS.accent : STEP_COLORS.line,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* x labels — era numbers or dates, thinned so they never overlap */}
        <div className="mt-1.5 flex gap-2">
          <span className={AXIS_CLASS} />
          <div className="flex min-w-0 flex-1">
            {rows.map((row, index) => {
              const labelled = row.isActive || (count - 1 - index) % labelStride === 0;
              const date = row.dateMs === null ? null : formatDate(row.dateMs, ERA_DATE_FORMAT);
              const primary = axisMode === 'timeline' ? (date ?? formatEraNumber(row.era)) : formatEraNumber(row.era);
              const secondary = axisMode === 'timeline' ? null : showValueLabels ? date : null;

              return (
                <div key={row.era} className="min-w-0 flex-1 text-center leading-tight">
                  {labelled && (
                    <HelpText
                      className={cnTw(
                        'block font-semibold whitespace-nowrap tabular-nums',
                        row.isActive ? 'text-tab-text-accent' : 'text-text-secondary',
                      )}
                    >
                      {primary}
                    </HelpText>
                  )}
                  {labelled && secondary !== null && (
                    <HelpText className="block whitespace-nowrap text-text-tertiary">{secondary}</HelpText>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  },
);
