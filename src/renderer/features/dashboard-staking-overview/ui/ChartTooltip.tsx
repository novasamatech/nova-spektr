import { CHART_TOOLTIP_STYLE } from './chartConstants';

type TooltipEntry = {
  name: string;
  percent: number;
};

type TooltipPayloadItem = {
  payload: TooltipEntry;
};

type Props = {
  active?: boolean;
  payload?: TooltipPayloadItem[];
};

export const ChartTooltip = ({ active, payload }: Props) => {
  if (!active || !payload?.length) return null;

  const item = payload[0];
  if (!item) return null;

  return (
    <div style={CHART_TOOLTIP_STYLE}>
      <div style={{ fontWeight: 600 }}>{item.payload.name}</div>
      <div>{item.payload.percent.toFixed(1)}%</div>
    </div>
  );
};
