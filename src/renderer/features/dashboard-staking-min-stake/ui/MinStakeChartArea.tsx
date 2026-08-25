import { useState } from 'react';

import { type Asset } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { type MinStakeRow } from '../hooks/useMinStakeRows';
import { TOOLTIP_WIDTH } from '../lib/constants';
import { type AxisMode } from '../lib/range';
import { type ScaleWindow } from '../lib/scale';

import { type ChartHover, MinStakeStepChart } from './MinStakeStepChart';
import { MinStakeTooltip } from './MinStakeTooltip';

type Props = {
  rows: MinStakeRow[];
  scaleWindow: ScaleWindow;
  axisMode: AxisMode;
  asset: Asset;
  showFiat: boolean;
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

/**
 * The plot plus its hover card. Hover state lives here, below the headline and
 * the controls, so moving the pointer across the eras re-renders the plot only
 * — not the whole drill-down.
 */
export const MinStakeChartArea = ({ rows, scaleWindow, axisMode, asset, showFiat }: Props) => {
  const { formatDate } = useI18n();
  const [hover, setHover] = useState<ChartHover | null>(null);

  const hoveredRow = hover ? rows[hover.index] : undefined;
  const tooltipLeft = hover ? clamp(hover.x - TOOLTIP_WIDTH / 2, 0, Math.max(hover.width - TOOLTIP_WIDTH, 0)) : 0;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <MinStakeStepChart
        rows={rows}
        scaleWindow={scaleWindow}
        axisMode={axisMode}
        hoveredIndex={hover?.index ?? null}
        formatDate={formatDate}
        onHoverChange={setHover}
      />
      {hoveredRow && hover && (
        <div className="pointer-events-none absolute top-1 z-10" style={{ left: tooltipLeft }}>
          <MinStakeTooltip
            row={hoveredRow}
            previous={rows[hover.index - 1]}
            asset={asset}
            showFiat={showFiat}
            formatDate={formatDate}
          />
        </div>
      )}
    </div>
  );
};
