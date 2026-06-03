import { DragDropProvider } from '@dnd-kit/react';
import { useUnit } from 'effector-react';
import { type ComponentProps, type ComponentType, memo, useEffect, useMemo, useRef } from 'react';

import { type SlotIdentifier, type SlotProps } from '@/shared/di/createSlot';
import { type Rect, type Size, GRID_COLUMNS, ROW_HEIGHT_PX, syncLayout } from '../lib/layout-engine';
import { readLegacyOrder } from '../lib/legacy-order';
import { dashboardModel } from '../model/dashboard-model';

import { type WidgetGridMeta } from './Dashboard';
import { WidgetSortableProvider } from './WidgetSortableContext';

const EMPTY_PROPS: Record<string, unknown> = {};
const FALLBACK_DEFAULT: Size = { w: 2, h: 3 };
const FALLBACK_MIN: Size = { w: 1, h: 2 };
const GAP_PX = 16; // matches the grid's gap-4

const layoutsEqual = (a: Record<string, Rect>, b: Record<string, Rect>): boolean => {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;

  return ak.every((k) => {
    const x = a[k];
    const y = b[k];

    return !!y && x!.x === y.x && x!.y === y.y && x!.w === y.w && x!.h === y.h;
  });
};

type Props<P extends SlotProps> = {
  slot: SlotIdentifier<P, WidgetGridMeta>;
  tab: string;
  props: P;
  editMode: boolean;
};

const DashboardGridInner = <P extends SlotProps>({ slot, tab, props, editMode }: Props<P>) => {
  const handlers = useUnit(slot.$handlers);
  const widgetLayout = useUnit(dashboardModel.$widgetLayout);
  const layoutSet = useUnit(dashboardModel.layoutSet);
  const widgetMoved = useUnit(dashboardModel.widgetMoved);
  const widgetResized = useUnit(dashboardModel.widgetResized);

  const gridRef = useRef<HTMLDivElement>(null);

  const available = useMemo(
    () =>
      handlers
        .filter((h) => {
          try {
            return h.available() && h.key != null;
          } catch {
            return false;
          }
        })
        .sort((a, b) => (a.body.order ?? 0) - (b.body.order ?? 0)),
    [handlers],
  );

  const sizes = useMemo(() => {
    const map: Record<string, Size> = {};
    const mins: Record<string, Size> = {};
    for (const h of available) {
      map[h.key!] = h.body.defaultSize ?? FALLBACK_DEFAULT;
      mins[h.key!] = h.body.minSize ?? FALLBACK_MIN;
    }

    return { defaults: map, mins };
  }, [available]);

  const orderedKeys = useMemo(() => {
    const keys = available.map((h) => h.key!);
    // A stored layout (including the empty `{}` left by a reset) means seed new
    // widgets by body.order. Only on genuine first load (no stored tab) do we
    // migrate from the legacy widget order.
    if (widgetLayout[tab] !== undefined) return keys;

    const legacy = readLegacyOrder(tab).filter((k) => keys.includes(k));
    const rest = keys.filter((k) => !legacy.includes(k));

    return [...legacy, ...rest];
  }, [available, tab, widgetLayout]);

  const stored = widgetLayout[tab];

  const effective = useMemo(
    () => syncLayout(stored ?? {}, orderedKeys, sizes.defaults),
    [stored, orderedKeys, sizes.defaults],
  );

  useEffect(() => {
    if (!layoutsEqual(effective, stored ?? {})) {
      layoutSet({ tab, layout: effective });
    }
  }, [effective, stored, tab, layoutSet]);

  const renderKeys = useMemo(
    () =>
      Object.entries(effective)
        .sort(([, a], [, b]) => a.y - b.y || a.x - b.x)
        .map(([key]) => key),
    [effective],
  );

  const handleDragEnd: ComponentProps<typeof DragDropProvider>['onDragEnd'] = (event) => {
    const activeId = String(event.operation.source?.id ?? '');
    if (!activeId) return;

    const moved = effective[activeId];
    const grid = gridRef.current;
    const pointer = event.operation.position?.current;
    if (!moved || !grid || !pointer) return;

    const gridRect = grid.getBoundingClientRect();
    const colWidth = gridRect.width / GRID_COLUMNS;
    const rowStride = ROW_HEIGHT_PX + GAP_PX;

    const rawX = Math.floor((pointer.x - gridRect.left) / colWidth);
    const rawY = Math.floor((pointer.y - gridRect.top) / rowStride);

    const x = Math.max(0, Math.min(rawX, GRID_COLUMNS - moved.w));
    const y = Math.max(0, rawY);

    if (x === moved.x && y === moved.y) return;
    widgetMoved({ tab, key: activeId, x, y });
  };

  const componentProps = (props ?? EMPTY_PROPS) satisfies Record<string, unknown>;
  const handlersByKey = useMemo(() => new Map(available.map((h) => [h.key!, h])), [available]);

  return (
    <DragDropProvider onDragEnd={handleDragEnd}>
      <div
        ref={gridRef}
        className="grid h-full w-full gap-4 overflow-y-auto p-3"
        style={{
          gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`,
          gridAutoRows: `${ROW_HEIGHT_PX}px`,
        }}
      >
        {renderKeys.map((key, index) => {
          const handler = handlersByKey.get(key);
          const rect = effective[key];
          if (!handler || !rect) return null;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const Component = handler.body.render as ComponentType<any>;
          const min = sizes.mins[key] ?? FALLBACK_MIN;

          return (
            <WidgetSortableProvider
              key={key}
              id={key}
              index={index}
              editMode={editMode}
              rect={rect}
              minSize={min}
              onResize={(next: Size) => {
                const w = Math.max(min.w, Math.min(next.w, GRID_COLUMNS - rect.x));
                const h = Math.max(min.h, next.h);
                widgetResized({ tab, key, w, h });
              }}
            >
              <Component {...componentProps} />
            </WidgetSortableProvider>
          );
        })}
      </div>
    </DragDropProvider>
  );
};

export const DashboardGrid = memo(DashboardGridInner) as typeof DashboardGridInner;
