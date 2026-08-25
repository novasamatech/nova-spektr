import { useMemo } from 'react';

import { type MinStakeRow } from '../hooks/useMinStakeRows';
import { STEP_COLORS } from '../lib/constants';
import { type ScaleWindow, fractionOf } from '../lib/scale';

type Props = {
  rows: MinStakeRow[];
  scaleWindow: ScaleWindow;
};

/** Internal SVG coordinate space; stretched to the box by the viewBox. */
const VIEW = 1000;

/**
 * The KPI card's step line: the same shape as the drill-down's plot with no
 * axes, labels or hover — a glance at direction, zoomed to the band so a flat
 * week still shows shape. The last era's segment and dot carry the accent.
 */
export const MinStakeSparkline = ({ rows, scaleWindow }: Props) => {
  const geometry = useMemo(() => {
    const count = rows.length;
    const columnWidth = VIEW / count;
    const yOf = (row: MinStakeRow) => VIEW - fractionOf(scaleWindow, row.tokens) * VIEW;

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
      endY: last === undefined ? VIEW : yOf(last),
    };
  }, [rows, scaleWindow]);

  return (
    <svg viewBox={`0 0 ${VIEW} ${VIEW}`} preserveAspectRatio="none" className="block h-full w-full overflow-visible">
      <polygon points={geometry.areaPoints} style={{ fill: STEP_COLORS.area }} opacity={0.7} />
      <polyline
        points={geometry.linePoints}
        fill="none"
        style={{ stroke: STEP_COLORS.line }}
        strokeWidth={1.6}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <polyline
        points={geometry.activePoints}
        fill="none"
        style={{ stroke: STEP_COLORS.accent }}
        strokeWidth={2.2}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};
