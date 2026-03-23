import { useSortable } from '@dnd-kit/react/sortable';
import { type ReactNode, type RefObject, createContext, useContext, useMemo, useRef } from 'react';

type WidgetSortableContextValue = {
  sortableRef: (element: Element | null) => void;
  handleRef: RefObject<HTMLButtonElement | null>;
  editMode: boolean;
  isDragging: boolean;
};

const WidgetSortableContext = createContext<WidgetSortableContextValue | null>(null);

export const useWidgetSortable = () => useContext(WidgetSortableContext);

type ProviderProps = {
  id: string;
  index: number;
  editMode: boolean;
  children: ReactNode;
};

export const WidgetSortableProvider = ({ id, index, editMode, children }: ProviderProps) => {
  const handleRef = useRef<HTMLButtonElement>(null);
  const { ref, isDragging } = useSortable({
    id,
    index,
    handle: handleRef,
    disabled: !editMode,
  });

  const value = useMemo(
    () => ({ sortableRef: ref, handleRef, editMode, isDragging }),
    [ref, handleRef, editMode, isDragging],
  );

  return <WidgetSortableContext.Provider value={value}>{children}</WidgetSortableContext.Provider>;
};
