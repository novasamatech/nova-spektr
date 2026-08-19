export type Rect = { x: number; y: number; w: number; h: number };
export type Size = { w: number; h: number };

export const GRID_COLUMNS = 4;
export const ROW_HEIGHT_PX = 76; // tune against real widgets

type Entry = [key: string, rect: Rect];

const byPosition = ([, a]: Entry, [, b]: Entry): number => a.y - b.y || a.x - b.x;

const overlapsX = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && b.x < a.x + a.w;

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return overlapsX(a, b) && a.y < b.y + b.h && b.y < a.y + a.h;
}

export function compactVertical(layout: Record<string, Rect>): Record<string, Rect> {
  const entries = Object.entries(layout).sort(byPosition);
  const placed: Entry[] = [];
  const result: Record<string, Rect> = {};

  for (const [key, rect] of entries) {
    let y = 0;
    for (const [, other] of placed) {
      if (overlapsX(rect, other)) {
        y = Math.max(y, other.y + other.h);
      }
    }
    const next = { ...rect, y };
    placed.push([key, next]);
    result[key] = next;
  }

  return result;
}

export function resolveCollisions(layout: Record<string, Rect>, movedKey: string): Record<string, Rect> {
  const moved = layout[movedKey];
  if (!moved) return layout;

  // Push anything overlapping the moved widget below it, then compact.
  // compactVertical processes top-to-bottom, so the moved widget (highest) stays put
  // while displaced widgets flow back up around it — consistent with vertical compaction.
  const working: Record<string, Rect> = { ...layout };
  for (const [key, rect] of Object.entries(working)) {
    if (key !== movedKey && rectsOverlap(moved, rect)) {
      working[key] = { ...rect, y: moved.y + moved.h };
    }
  }

  return compactVertical(working);
}

function bottomOf(layout: Record<string, Rect>): number {
  let bottom = 0;
  for (const rect of Object.values(layout)) {
    bottom = Math.max(bottom, rect.y + rect.h);
  }

  return bottom;
}

/**
 * A stored rect brought back inside the rules that hold today.
 *
 * Storage is the one input nothing validates on the way in: it survives across
 * releases, so it can hold a width from before a widget declared a cap, a
 * height from before it declared a floor, or an `x` that made sense when the
 * widget was narrower. Every other path into the layout (drag, resize) clamps
 * at the source; this is where a layout written by an older build is brought
 * into line before anything renders it.
 *
 * Width is settled before `x`, because how far right a widget may start depends
 * on how wide it ends up being.
 *
 * The order of the bounds is the order of authority: the cap first, then the
 * floor — a widget declaring a minimum larger than its maximum is a mistake,
 * and rendering it below the size its content needs is the worse half of it —
 * and the grid's own width last, because that one is physical.
 */
export function clampRect(rect: Rect, min?: Size, max?: Size): Rect {
  const w = Math.min(GRID_COLUMNS, Math.max(Math.min(rect.w, max?.w ?? GRID_COLUMNS), min?.w ?? 1));
  const h = Math.max(Math.min(rect.h, max?.h ?? Number.MAX_SAFE_INTEGER), min?.h ?? 1);

  return {
    w,
    h,
    x: Math.max(0, Math.min(rect.x, GRID_COLUMNS - w)),
    y: Math.max(0, rect.y),
  };
}

export function syncLayout(
  stored: Record<string, Rect>,
  orderedKeys: string[],
  sizes: Record<string, Size>,
  maxSizes?: Record<string, Size>,
  minSizes?: Record<string, Size>,
): Record<string, Rect> {
  // Keep known rects in the given order; this also drops stale keys not in
  // orderedKeys. Stored rects are clamped back into the widget's declared
  // bounds and the grid's own width — see `clampRect`.
  const result: Record<string, Rect> = {};
  for (const key of orderedKeys) {
    const rect = stored[key];
    if (!rect) continue;
    result[key] = clampRect(rect, minSizes?.[key], maxSizes?.[key]);
  }

  // Place missing widgets in order, flowing left-to-right then wrapping rows
  // (this reproduces the old CSS auto-flow on first-time migration).
  let cursorX = 0;
  let cursorY = bottomOf(result);
  let rowMaxH = 0;
  for (const key of orderedKeys) {
    if (result[key]) continue;
    const size = clampRect({ x: 0, y: 0, ...(sizes[key] ?? { w: 2, h: 3 }) }, minSizes?.[key], maxSizes?.[key]);
    if (cursorX + size.w > GRID_COLUMNS) {
      cursorY += rowMaxH;
      cursorX = 0;
      rowMaxH = 0;
    }
    result[key] = { x: cursorX, y: cursorY, w: size.w, h: size.h };
    cursorX += size.w;
    rowMaxH = Math.max(rowMaxH, size.h);
  }

  return compactVertical(result);
}
