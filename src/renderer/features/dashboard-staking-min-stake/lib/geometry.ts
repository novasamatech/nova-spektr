/**
 * Internal SVG coordinate space of the step charts — a `VIEW`-sized square the
 * viewBox stretches to the box.
 */
export const VIEW = 1000;

export type StepGeometry = {
  linePoints: string;
  areaPoints: string;
  activePoints: string;
};

/**
 * The step line as SVG point lists. One column per row; every step is a
 * horizontal segment across its column, so the threshold reads as constant
 * inside an era. The last (active) era's segment is returned separately so it
 * can be drawn in the accent on top of the shared line. `yOf` maps a row to its
 * y in view units (0 = top).
 */
export function buildStepGeometry<T>(rows: T[], yOf: (row: T) => number): StepGeometry {
  const count = rows.length;
  const columnWidth = VIEW / count;

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

  return { linePoints, areaPoints: `${linePoints} ${VIEW},${VIEW} 0,${VIEW}`, activePoints };
}
