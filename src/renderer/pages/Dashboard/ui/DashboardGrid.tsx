import { DragDropProvider } from '@dnd-kit/react';
import { useUnit } from 'effector-react';
import { type ComponentProps, type ComponentType, memo, useEffect, useMemo, useRef } from 'react';

import { type SlotIdentifier, type SlotProps } from '@/shared/di/createSlot';
import { useI18n } from '@/shared/i18n';
import { getGridMetrics, toGridContentPoint } from '../lib/grid-metrics';
import { type Rect, type Size, GRID_COLUMNS, ROW_HEIGHT_PX, syncLayout } from '../lib/layout-engine';
import { readLegacyOrder } from '../lib/legacy-order';
import { partitionWidgets } from '../lib/widget-visibility';
import { dashboardModel } from '../model/dashboard-model';

import { type WidgetGridMeta } from './Dashboard';
import { WidgetSortableProvider } from './WidgetSortableContext';

const EMPTY_PROPS: Record<string, unknown> = {};
const FALLBACK_DEFAULT: Size = { w: 2, h: 3 };
const FALLBACK_MIN: Size = { w: 1, h: 2 };
const FALLBACK_MAX: Size = { w: GRID_COLUMNS, h: Number.MAX_SAFE_INTEGER };

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
  const { t } = useI18n();
  const handlers = useUnit(slot.$handlers);
  const widgetLayout = useUnit(dashboardModel.$widgetLayout);
  const layoutSet = useUnit(dashboardModel.layoutSet);
  const widgetMoved = useUnit(dashboardModel.widgetMoved);
  const widgetResized = useUnit(dashboardModel.widgetResized);
  const hiddenWidgets = useUnit(dashboardModel.$hiddenWidgets);
  const widgetHidden = useUnit(dashboardModel.widgetHidden);

  const gridRef = useRef<HTMLDivElement>(null);

  const { visible: available, hidden } = useMemo(
    () => partitionWidgets(handlers, hiddenWidgets[tab] ?? []),
    [handlers, hiddenWidgets, tab],
  );

  const sizes = useMemo(() => {
    const map: Record<string, Size> = {};
    const mins: Record<string, Size> = {};
    const maxes: Record<string, Size> = {};
    for (const h of available) {
      map[h.key] = h.body.defaultSize ?? FALLBACK_DEFAULT;
      mins[h.key] = h.body.minSize ?? FALLBACK_MIN;
      maxes[h.key] = h.body.maxSize ?? FALLBACK_MAX;
    }

    return { defaults: map, mins, maxes };
  }, [available]);

  const orderedKeys = useMemo(() => {
    const keys = available.map((h) => h.key);
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
    () => syncLayout(stored ?? {}, orderedKeys, sizes.defaults, sizes.maxes, sizes.mins),
    [stored, orderedKeys, sizes.defaults, sizes.maxes, sizes.mins],
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

    const { colStride, rowStride } = getGridMetrics(grid);
    const content = toGridContentPoint(grid, pointer);

    const x = Math.max(0, Math.min(Math.floor(content.x / colStride), GRID_COLUMNS - moved.w));
    const y = Math.max(0, Math.floor(content.y / rowStride));

    if (x === moved.x && y === moved.y) return;
    widgetMoved({ tab, key: activeId, x, y });
  };

  const componentProps = (props ?? EMPTY_PROPS) satisfies Record<string, unknown>;
  const handlersByKey = useMemo(() => new Map(available.map((h) => [h.key, h])), [available]);

  return (
    <DragDropProvider onDragEnd={handleDragEnd}>
      {/* x is clipped, never scrolled: columns are fractions of this box, so
          anything wider is a rounding artefact — see DashboardWidget */}
      <div
        ref={gridRef}
        className="grid h-full w-full gap-4 overflow-x-hidden overflow-y-auto p-3"
        style={{
          gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`,
          gridAutoRows: `${ROW_HEIGHT_PX}px`,
        }}
      >
        {renderKeys.length === 0 && hidden.length > 0 && (
          // Spans rows rather than padding itself: the hint is a grid item and
          // the grid's auto rows are only ROW_HEIGHT_PX tall.
          <div className="col-span-full row-span-3 flex items-center justify-center text-footnote text-text-tertiary">
            {editMode ? t('dashboard.allWidgetsHidden') : t('dashboard.allWidgetsHiddenView')}
          </div>
        )}
        {renderKeys.map((key, index) => {
          const handler = handlersByKey.get(key);
          const rect = effective[key];
          if (!handler || !rect) return null;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const Component = handler.body.render as ComponentType<any>;
          const min = sizes.mins[key] ?? FALLBACK_MIN;
          const max = sizes.maxes[key] ?? FALLBACK_MAX;

          return (
            <WidgetSortableProvider
              key={key}
              id={key}
              index={index}
              editMode={editMode}
              rect={rect}
              minSize={min}
              maxSize={max}
              onResize={(next: Size) => {
                const w = Math.max(min.w, Math.min(next.w, max.w, GRID_COLUMNS - rect.x));
                const h = Math.max(min.h, Math.min(next.h, max.h));
                widgetResized({ tab, key, w, h });
              }}
              onHide={() => widgetHidden({ tab, key })}
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
