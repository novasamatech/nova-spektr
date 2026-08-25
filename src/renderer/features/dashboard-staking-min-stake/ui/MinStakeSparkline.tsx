import { useMemo } from 'react';

import { type MinStakeRow } from '../hooks/useMinStakeRows';
import { STEP_COLORS } from '../lib/constants';
import { VIEW, buildStepGeometry } from '../lib/geometry';
import { type ScaleWindow, fractionOf } from '../lib/scale';

type Props = {
  rows: MinStakeRow[];
  scaleWindow: ScaleWindow;
};

/**
 * The KPI card's step line: the same shape as the drill-down's plot with no
 * axes, labels or hover — a glance at direction, zoomed to the band so a flat
 * week still shows shape. The last era's segment and dot carry the accent.
 */
export const MinStakeSparkline = ({ rows, scaleWindow }: Props) => {
  const geometry = useMemo(
    () => buildStepGeometry(rows, (row: MinStakeRow) => VIEW - fractionOf(scaleWindow, row.tokens) * VIEW),
    [rows, scaleWindow],
  );

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
