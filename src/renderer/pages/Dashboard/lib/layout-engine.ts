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

export function clampRect(rect: Rect, min: Size): Rect {
  // Anchor x within the grid, reserving room for at least the minimum width,
  // then shrink the width to whatever still fits to the right of that anchor.
  const x = Math.min(GRID_COLUMNS - min.w, Math.max(0, rect.x));
  const w = Math.min(GRID_COLUMNS - x, Math.max(min.w, rect.w));
  const h = Math.max(min.h, rect.h);
  const y = Math.max(0, rect.y);

  return { x, y, w, h };
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
