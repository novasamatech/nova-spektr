import { type MouseEvent, type ReactNode, memo, useCallback, useRef } from 'react';
import { Cell, Pie, PieChart } from 'recharts';

import { cnTw } from '@/shared/lib/utils';

export type DonutSlice = {
  id: string;
  value: number;
  color: string;
};

type Props = {
  data: DonutSlice[];
  size?: number;
  /** Cross-highlight with the row list next to the chart. */
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  /** Centre content — the total, or the hovered row's figures. */
  children: ReactNode;
};

/**
 * A single slice is a legitimate "everything is on one chain" answer, so the
 * guard is on an empty list — Recharts draws one slice as a full ring.
 *
 * **Animation is off, deliberately.** The ring is hover-driven, and every hover
 * re-renders it; with animation on, Recharts mounts and unmounts its
 * `JavascriptAnimate` on each of those renders and the unmount sets state on
 * the way out. Moving the pointer across the ring queued those faster than
 * React could flush them and it blew the update-depth limit. A donut that
 * appears instantly is also simply the right behaviour for a chart the user is
 * pointing at.
 *
 * **The wrapper decides when the pointer is on nothing, not Recharts.**
 * Recharts binds enter and leave to each sector's own `<g>`; the enter is
 * dependable, the leave is not — sweeping the pointer across the ring and off
 * it left the last sector lit until a row was hovered, because the sector it
 * belonged to never saw the exit. The container cannot miss it: `mouseleave`
 * fires when the pointer leaves the box at all, and a `mousemove` landing
 * anywhere that is not a sector — the hole in the middle, the corners around
 * the ring — says the same thing one frame later.
 */
export const DonutBreakdown = memo(({ data, size = 180, hoveredId, onHover, children }: Props) => {
  // Read through a ref so the handlers stay referentially stable: a new
  // `onMouseEnter` identity makes Recharts rebuild the sector tree, which is
  // exactly the churn this chart cannot afford.
  const dataRef = useRef(data);
  dataRef.current = data;

  const handleEnter = useCallback(
    (_: unknown, index: number) => onHover(dataRef.current[index]?.id ?? null),
    [onHover],
  );
  const handleLeave = useCallback(() => onHover(null), [onHover]);

  const handleMove = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const target = event.target;
      if (!(target instanceof Element) || target.closest('.recharts-pie-sector') === null) {
        onHover(null);
      }
    },
    [onHover],
  );

  if (data.length === 0) return null;

  const inner = size * 0.31;
  const outer = size * 0.48;

  return (
    <div
      className="relative shrink-0 select-none [&_.recharts-sector]:outline-none [&_svg]:outline-none"
      style={{ width: size, height: size }}
      onMouseDown={(event) => event.preventDefault()}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      <PieChart width={size} height={size}>
        <Pie
          data={data}
          innerRadius={inner}
          outerRadius={outer}
          dataKey="value"
          stroke="none"
          isAnimationActive={false}
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        >
          {data.map((slice) => (
            <Cell
              key={slice.id}
              fill={slice.color}
              className={cnTw(
                'transition-[fill-opacity]',
                hoveredId !== null && hoveredId !== slice.id ? '[fill-opacity:0.3]' : '[fill-opacity:1]',
              )}
            />
          ))}
        </Pie>
      </PieChart>

      <div
        className="pointer-events-none absolute flex flex-col items-center justify-center rounded-full text-center"
        style={{ inset: size * 0.26 }}
      >
        {children}
      </div>
    </div>
  );
});
