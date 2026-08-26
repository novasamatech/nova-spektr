/**
 * Value window of the step chart's y-axis.
 *
 * The 7-era threshold series is nearly flat — on Polkadot the whole band is
 * under 1% of the value — so a zero-based axis would draw eight identical steps
 * and say nothing. The axis is therefore zoomed to the data, and the card
 * states the zoom explicitly ("axis floor … — zoomed, not zero").
 */
export type ScaleWindow = {
  floor: number;
  ceil: number;
  span: number;
  /** Step between gridlines — the axis label precision follows it. */
  step: number;
  /** Gridline values, ascending, strictly inside the window. */
  gridlines: number[];
};

/**
 * How far below the smallest value the axis floor sits, as a share of the data
 * range.
 */
const FLOOR_PADDING_RATIO = 0.4;
/** Headroom above the largest value, as a share of the data range. */
const CEIL_PADDING_RATIO = 0.2;
/**
 * Top strip (share of the window) kept free of gridlines so the tallest step's
 * label stays clear.
 */
const TOP_LABEL_CLEARANCE_RATIO = 0.06;

/** 1-2-5 rounding, so gridline values stay readable. */
const niceStep = (raw: number): number => {
  const power = Math.pow(10, Math.floor(Math.log10(raw)));
  const unit = raw / power;
  const factor = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10;

  return factor * power;
};

export const buildWindow = (values: number[]): ScaleWindow => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  // A literally constant series still gets a visible band — 0.1% of the value
  // — so the line sits mid-plot instead of collapsing onto the axis.
  const range = max - min || Math.max(max * 0.001, 1);

  const floor = Math.max(min - range * FLOOR_PADDING_RATIO, 0);
  const ceil = max + range * CEIL_PADDING_RATIO;
  const span = ceil - floor;
  const step = niceStep(span / 3);

  const gridlines: number[] = [];
  for (let line = Math.ceil(floor / step) * step; line < ceil - span * TOP_LABEL_CLEARANCE_RATIO; line += step) {
    if (line > floor) gridlines.push(line);
  }

  return { floor, ceil, span, step, gridlines };
};

/** Vertical position of a value inside the window, 0 (floor) to 1 (ceil). */
export const fractionOf = (window: ScaleWindow, value: number): number => {
  return Math.min(Math.max((value - window.floor) / window.span, 0), 1);
};
