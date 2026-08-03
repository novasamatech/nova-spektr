import { createContext, useContext } from 'react';

/**
 * Which slice the pointer is on, and where the pointer came from.
 *
 * A context rather than a prop on purpose. The colour dot in every row has to
 * dim when another slice is hovered, but a `hoveredId` threaded through the
 * table's column definitions would change their identity on every pointer move
 * and re-render the whole list — with a `NamedAccount` in each row, that is
 * name resolution per frame. Through a context only the dots re-render; the
 * memoised table is skipped entirely.
 */
export type SliceHover = {
  hoveredId: string | null;
};

const SliceHoverContext = createContext<SliceHover>({ hoveredId: null });

export const SliceHoverProvider = SliceHoverContext.Provider;

export const useSliceHover = (): SliceHover => useContext(SliceHoverContext);

/** The row's tie to its slice: same colour, dimmed while another is hovered. */
export const SliceDot = ({ id, color }: { id: string; color: string }) => {
  const { hoveredId } = useSliceHover();

  return (
    <span
      aria-hidden
      className="size-2 shrink-0 rounded-full transition-opacity"
      style={{ backgroundColor: color, opacity: hoveredId !== null && hoveredId !== id ? 0.3 : 1 }}
    />
  );
};
