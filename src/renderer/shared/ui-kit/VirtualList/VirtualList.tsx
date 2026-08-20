import { useVirtualizer } from '@tanstack/react-virtual';
import { type ReactNode, useLayoutEffect, useRef, useState } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { useScrollAreaViewport } from '../ScrollArea/context';
import { gridSpaceConverter } from '../_helpers/gridSpaceConverter';

type Props<T> = {
  items: T[];
  /**
   * Height of one row in px, used before a row has been measured. Rows may
   * differ from it — real heights are measured once mounted — but a value close
   * to the truth keeps the scrollbar from jumping while scrolling fast.
   */
  estimateSize: number;
  /** Rows kept mounted beyond each edge of the viewport. */
  overscan?: number;
  /**
   * Space between rows, in grid units — same scale as `Box`'s `gap`.
   *
   * Applied as padding on each row wrapper rather than as a flex `gap`, so that
   * it is part of what gets measured and the spacers stay in step with the rows
   * they replace.
   */
  gap?: number;
  /** Stable row key. Falls back to the row index. */
  getItemKey?: (item: T, index: number) => string | number;
  className?: string;
  children: (item: T, index: number) => ReactNode;
};

/**
 * Renders only the rows in (and around) the enclosing `ScrollArea`'s viewport.
 *
 * Mounting a few hundred rich rows at once costs seconds of blocked main thread
 * — the wallet selector with a few hundred wallets is the case this was built
 * for. Rows keep normal flow layout; the ones outside the viewport are replaced
 * by a pair of spacers, so nothing about the caller's own spacing or sticky
 * headers changes.
 *
 * Must be rendered inside a `ScrollArea`; without one it falls back to
 * rendering every row.
 */
export const VirtualList = <T,>({
  items,
  estimateSize,
  overscan = 10,
  gap = 0,
  getItemKey,
  className,
  children,
}: Props<T>) => {
  const gapPx = gap ? gridSpaceConverter(gap) : 0;
  const viewportRef = useScrollAreaViewport();
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  // The viewport is an *ancestor*, and React attaches an ancestor's ref only
  // after a descendant's layout effect has run — so on first mount the ref is
  // still empty. Resolving it into state on every render (a ref read, nothing
  // measured) is what lets the measuring effect below start once it exists.
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const next = viewportRef?.current ?? null;
    setScrollElement(prev => (prev === next ? prev : next));
  });

  // Row positions are relative to the scroll viewport, but anything rendered
  // above this list inside the same viewport pushes it down. Measured on
  // resize only — the virtualizer re-renders on every scroll frame, and a
  // `getBoundingClientRect` there would force a synchronous layout on each one.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || !scrollElement) return;

    const measure = () => {
      const margin = Math.round(
        list.getBoundingClientRect().top - scrollElement.getBoundingClientRect().top + scrollElement.scrollTop,
      );
      setScrollMargin(prev => (prev === margin ? prev : margin));
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(scrollElement);
    // Content above this list growing (another group expanding, a header
    // rewrapping) moves it without resizing the viewport.
    const scrollContent = scrollElement.firstElementChild;
    if (scrollContent) observer.observe(scrollContent);

    return () => observer.disconnect();
  }, [scrollElement, items.length]);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => estimateSize + gapPx,
    overscan,
    scrollMargin,
    getItemKey: getItemKey
      ? index => {
          const item = items[index];

          return item === undefined ? index : getItemKey(item, index);
        }
      : undefined,
  });

  if (!scrollElement) {
    // Outside a `ScrollArea` there is no viewport to virtualize against, so
    // render the whole list — that is the documented fallback.
    if (!viewportRef) {
      return (
        <div ref={listRef} className={className}>
          {items.map((item, index) => (
            <div key={getItemKey?.(item, index) ?? index} style={gapPx ? { paddingBottom: gapPx } : undefined}>
              {children(item, index)}
            </div>
          ))}
        </div>
      );
    }

    // Inside a `ScrollArea`, but this is the first render of the commit that
    // creates the viewport, so its ref is not attached yet. Render only the
    // full-height placeholder: the layout effect above resolves the viewport
    // and re-renders with real rows before the browser paints, so nothing
    // blank is ever shown — while rendering the rows here would mount the
    // entire list once just to throw it away, which is the cost this component
    // exists to avoid.
    return (
      <div ref={listRef} className={cnTw('w-full', className)}>
        <div aria-hidden style={{ height: items.length * (estimateSize + gapPx) }} />
      </div>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();
  const firstItem = virtualItems.at(0);
  const lastItem = virtualItems.at(-1);
  // `start`/`end` include the scroll margin, `getTotalSize` does not.
  const topPad = firstItem ? firstItem.start - scrollMargin : 0;
  const bottomPad = lastItem ? virtualizer.getTotalSize() - (lastItem.end - scrollMargin) : 0;

  return (
    <div ref={listRef} className={cnTw('w-full', className)}>
      {topPad > 0 && <div aria-hidden style={{ height: topPad }} />}
      {virtualItems.map(virtualItem => {
        const item = items[virtualItem.index];
        if (item === undefined) return null;

        return (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
            style={gapPx ? { paddingBottom: gapPx } : undefined}
          >
            {children(item, virtualItem.index)}
          </div>
        );
      })}
      {bottomPad > 0 && <div aria-hidden style={{ height: bottomPad }} />}
    </div>
  );
};
