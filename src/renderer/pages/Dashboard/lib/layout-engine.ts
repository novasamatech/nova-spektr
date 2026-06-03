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
