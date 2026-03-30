import { move } from '@dnd-kit/helpers';
import { DragDropProvider } from '@dnd-kit/react';
import { useUnit } from 'effector-react';
import { type ComponentProps, type ComponentType, memo, useCallback, useMemo, useRef, useState } from 'react';

import { type SlotIdentifier, type SlotProps } from '@/shared/di/createSlot';
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
  const widgetOrder = useUnit(dashboardModel.$widgetOrder);
  const onOrderChanged = useUnit(dashboardModel.widgetOrderChanged);

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
    if (dragKeysRef.current) {
      onOrderChanged({ tab, order: dragKeysRef.current });
    }
    setDragKeys(null);
  }, [tab, onOrderChanged]);

  const componentProps = (props ?? EMPTY_PROPS) satisfies Record<string, unknown>;

  return (
    <DragDropProvider onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="grid h-full w-full grid-cols-4 items-start gap-4 overflow-y-auto p-4">
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
