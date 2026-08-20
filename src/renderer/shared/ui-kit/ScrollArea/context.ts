import { type RefObject, createContext, useContext } from 'react';

/**
 * The viewport element of the nearest enclosing `ScrollArea`.
 *
 * Published so that descendants which need to know what they scroll inside —
 * `VirtualList`, chiefly — can find it without every intermediate component
 * threading a ref down. `null` outside a `ScrollArea`.
 */
export const ScrollAreaViewportContext = createContext<RefObject<HTMLDivElement | null> | null>(null);

export const useScrollAreaViewport = () => useContext(ScrollAreaViewportContext);
