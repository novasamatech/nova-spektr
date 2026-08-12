import { useSortable } from '@dnd-kit/react/sortable';
import { type ReactNode, type RefObject, createContext, useContext, useMemo, useRef, useState } from 'react';

import { type Rect, type Size } from '../lib/layout-engine';

type WidgetSortableContextValue = {
  sortableRef: (element: Element | null) => void;
  handleRef: RefObject<HTMLButtonElement | null>;
  editMode: boolean;
  isDragging: boolean;
  rect: Rect;
  minSize: Size;
  maxSize: Size;
  resizePreview: (next: Size) => void;
  resizeCommit: () => void;
  hide: () => void;
};

const WidgetSortableContext = createContext<WidgetSortableContextValue | null>(null);

export const useWidgetSortable = () => useContext(WidgetSortableContext);

type ProviderProps = {
  id: string;
  index: number;
  editMode: boolean;
  rect: Rect;
  minSize: Size;
  maxSize: Size;
  onResize: (next: Size) => void;
  onHide: () => void;
  children: ReactNode;
};

export const WidgetSortableProvider = ({
  id,
  index,
  editMode,
  rect,
  minSize,
  maxSize,
  onResize,
  onHide,
  children,
}: ProviderProps) => {
  const handleRef = useRef<HTMLButtonElement>(null);
  const [preview, setPreview] = useState<Size | null>(null);
  const { ref, isDragging } = useSortable({
    id,
    index,
    handle: handleRef,
    disabled: !editMode,
  });

  const value = useMemo(
    () => ({
      sortableRef: ref,
      handleRef,
      editMode,
      isDragging,
      rect: preview ? { ...rect, w: preview.w, h: preview.h } : rect,
      minSize,
      maxSize,
      resizePreview: (next: Size) => setPreview(next),
      resizeCommit: () => {
        if (preview) onResize(preview);
        setPreview(null);
      },
      hide: onHide,
    }),
    [ref, handleRef, editMode, isDragging, rect, minSize, maxSize, onResize, preview, onHide],
  );

  return <WidgetSortableContext.Provider value={value}>{children}</WidgetSortableContext.Provider>;
};
