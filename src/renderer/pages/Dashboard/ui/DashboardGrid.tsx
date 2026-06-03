import { move } from '@dnd-kit/helpers';
import { DragDropProvider } from '@dnd-kit/react';
import { useUnit } from 'effector-react';
import { type ComponentProps, type ComponentType, memo, useCallback, useMemo, useRef, useState } from 'react';

import { type SlotIdentifier, type SlotProps } from '@/shared/di/createSlot';
import { type Rect, GRID_COLUMNS } from '../lib/layout-engine';
import { dashboardModel } from '../model/dashboard-model';

import { WidgetSortableProvider } from './WidgetSortableContext';

const EMPTY_PROPS: Record<string, unknown> = {};

type Props<P extends SlotProps> = {
  slot: SlotIdentifier<P>;
  tab: string;
  props: P;
  editMode: boolean;
};

const DashboardGridInner = <P extends SlotProps>({ slot, tab, props, editMode }: Props<P>) => {
  const handlers = useUnit(slot.$handlers);
  const widgetLayout = useUnit(dashboardModel.$widgetLayout);
  const onLayoutSet = useUnit(dashboardModel.layoutSet);

  // Bridge: derive a 1D order from the stored 2D layout (sorted by position).
  // Full 2D rendering lands in Task 10; this keeps existing DnD reorder working.
  const widgetOrder = useMemo<Record<string, string[]>>(() => {
    const result: Record<string, string[]> = {};
    for (const [tabKey, layout] of Object.entries(widgetLayout)) {
      result[tabKey] = Object.entries(layout)
        .sort(([, a], [, b]) => a.y - b.y || a.x - b.x)
        .map(([key]) => key);
    }

    return result;
  }, [widgetLayout]);

  const availableHandlers = useMemo(() => {
    return handlers.filter((h) => {
      try {
        return h.available();
      } catch {
        return false;
      }
    });
  }, [handlers]);

  const { orderedHandlers, handlersByKey } = useMemo(() => {
    const byKey = new Map(availableHandlers.map((h) => [h.key, h]));

    const savedOrder = widgetOrder[tab];
    if (!savedOrder || savedOrder.length === 0) {
      const sorted = [...availableHandlers].sort((a, b) => (a.body.order ?? 0) - (b.body.order ?? 0));

      return { orderedHandlers: sorted, handlersByKey: byKey };
    }

    const ordered = savedOrder.filter((key) => byKey.has(key)).map((key) => byKey.get(key)!);

    const orderedKeySet = new Set(savedOrder);
    const newHandlers = availableHandlers
      .filter((h) => h.key && !orderedKeySet.has(h.key))
      .sort((a, b) => (a.body.order ?? 0) - (b.body.order ?? 0));

    return { orderedHandlers: [...ordered, ...newHandlers], handlersByKey: byKey };
  }, [availableHandlers, widgetOrder, tab]);

  const storeKeys = useMemo(
    () => orderedHandlers.map((h) => h.key).filter((key): key is string => key != null),
    [orderedHandlers],
  );

  const [dragKeys, setDragKeys] = useState<string[] | null>(null);
  const dragKeysRef = useRef<string[] | null>(null);
  dragKeysRef.current = dragKeys;

  const displayKeys = dragKeys ?? storeKeys;

  const handleDragStart = useCallback(() => {
    setDragKeys(storeKeys);
  }, [storeKeys]);

  const handleDragOver: ComponentProps<typeof DragDropProvider>['onDragOver'] = useCallback(
    (event: Parameters<NonNullable<ComponentProps<typeof DragDropProvider>['onDragOver']>>[0]) => {
      setDragKeys((prev) => {
        if (!prev) return prev;
        const next = move(prev, event);

        return next.join(',') === prev.join(',') ? prev : next;
      });
    },
    [],
  );

  const handleDragEnd = useCallback(() => {
    const keys = dragKeysRef.current;
    if (keys) {
      // Bridge: persist the new order as a vertically stacked layout.
      // Real 2D placement (preserving widths/heights) lands in Task 10.
      const layout: Record<string, Rect> = {};
      for (const [index, key] of keys.entries()) {
        layout[key] = { x: 0, y: index, w: GRID_COLUMNS, h: 1 };
      }
      onLayoutSet({ tab, layout });
    }
    setDragKeys(null);
  }, [tab, onLayoutSet]);

  const componentProps = (props ?? EMPTY_PROPS) satisfies Record<string, unknown>;

  return (
    <DragDropProvider onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="grid h-full w-full grid-cols-4 items-start gap-4 overflow-y-auto p-3">
        {displayKeys.map((key, index) => {
          const handler = handlersByKey.get(key);
          if (!handler) return null;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const Component = handler.body.render as ComponentType<any>;

          return (
            <WidgetSortableProvider key={key} id={key} index={index} editMode={editMode}>
              <Component {...componentProps} />
            </WidgetSortableProvider>
          );
        })}
      </div>
    </DragDropProvider>
  );
};

export const DashboardGrid = memo(DashboardGridInner) as typeof DashboardGridInner;
