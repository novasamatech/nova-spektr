import { useSortable } from '@dnd-kit/react/sortable';
import { type ReactNode, type RefObject, createContext, useContext, useMemo, useRef } from 'react';

import { type Rect, type Size } from '../lib/layout-engine';

type WidgetSortableContextValue = {
  sortableRef: (element: Element | null) => void;
  handleRef: RefObject<HTMLButtonElement | null>;
  editMode: boolean;
  isDragging: boolean;
  rect: Rect;
  minSize: Size;
  onResize: (next: Size) => void;
};

const WidgetSortableContext = createContext<WidgetSortableContextValue | null>(null);

export const useWidgetSortable = () => useContext(WidgetSortableContext);

type ProviderProps = {
  id: string;
  index: number;
  editMode: boolean;
  rect: Rect;
  minSize: Size;
  onResize: (next: Size) => void;
  children: ReactNode;
};

export const WidgetSortableProvider = ({ id, index, editMode, rect, minSize, onResize, children }: ProviderProps) => {
  const handleRef = useRef<HTMLButtonElement>(null);
  const { ref, isDragging } = useSortable({
    id,
    index,
    handle: handleRef,
    disabled: !editMode,
  });

  const value = useMemo(
    () => ({ sortableRef: ref, handleRef, editMode, isDragging, rect, minSize, onResize }),
    [ref, handleRef, editMode, isDragging, rect, minSize, onResize],
  );

  return <WidgetSortableContext.Provider value={value}>{children}</WidgetSortableContext.Provider>;
};
