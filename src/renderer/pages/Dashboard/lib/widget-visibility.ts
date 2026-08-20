/** The part of a slot handler the grid needs to decide whether to show a widget. */
export type WidgetHandler = {
  key?: string | null;
  available: () => boolean;
  body: { order?: number };
};

type Identified<T> = T & { key: string };

const hasKey = <T extends WidgetHandler>(handler: T): handler is Identified<T> => handler.key != null;

const byOrder = (a: WidgetHandler, b: WidgetHandler) => (a.body.order ?? 0) - (b.body.order ?? 0);

/**
 * Splits a tab's widgets into the ones the grid renders and the ones the "Add
 * widget" list offers back, both in injection order.
 *
 * A widget only counts once its feature is available: one hidden behind a
 * feature flag that later turned off is neither drawn nor restorable, so the
 * grid must not report it as "everything is hidden" and the restore list must
 * not offer a widget that would never appear.
 *
 * @param handlers Slot handlers of one tab, in registration order.
 * @param hiddenKeys Keys the user hid on that tab.
 */
export const partitionWidgets = <T extends WidgetHandler>(
  handlers: readonly T[],
  hiddenKeys: readonly string[],
): { visible: Identified<T>[]; hidden: Identified<T>[] } => {
  const hiddenSet = new Set(hiddenKeys);
  const visible: Identified<T>[] = [];
  const hidden: Identified<T>[] = [];

  for (const handler of handlers) {
    let isAvailable = false;
    try {
      isAvailable = handler.available();
    } catch {
      // `available()` runs feature code; a widget that cannot answer is skipped.
      continue;
    }

    if (!isAvailable || !hasKey(handler)) continue;

    if (hiddenSet.has(handler.key)) {
      hidden.push(handler);
    } else {
      visible.push(handler);
    }
  }

  visible.sort(byOrder);
  hidden.sort(byOrder);

  return { visible, hidden };
};
