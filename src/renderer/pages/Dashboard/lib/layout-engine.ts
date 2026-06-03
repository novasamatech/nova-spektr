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

export function syncLayout(
  stored: Record<string, Rect>,
  orderedKeys: string[],
  sizes: Record<string, Size>,
): Record<string, Rect> {
  // Keep known rects in the given order; this also drops stale keys not in orderedKeys.
  const result: Record<string, Rect> = {};
  for (const key of orderedKeys) {
    if (stored[key]) result[key] = stored[key]!;
  }

  // Place missing widgets in order, flowing left-to-right then wrapping rows
  // (this reproduces the old CSS auto-flow on first-time migration).
  let cursorX = 0;
  let cursorY = bottomOf(result);
  let rowMaxH = 0;
  for (const key of orderedKeys) {
    if (result[key]) continue;
    const size = sizes[key] ?? { w: 2, h: 3 };
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
