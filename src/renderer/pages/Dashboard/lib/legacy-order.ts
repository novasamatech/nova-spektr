const LEGACY_KEY = 'dashboard-widget-order';

/**
 * Widgets that used to be one and are now several, keyed by the DI key the old
 * one was saved under.
 *
 * A saved order survives the split: unknown keys are dropped and new widgets
 * appended at the end, so without this the four staking cards would silently
 * jump below everything the user had arranged. Expanding the old key in place
 * keeps them where they were.
 *
 * The third card of that split was "Nominated validators"; it was replaced by
 * the network-level "Min stake to enter the active set" card, which inherits
 * its slot so an arranged row does not get a hole.
 */
const WIDGET_SPLITS: Record<string, string[]> = {
  'feature: dashboard/staking-kpi': [
    'feature: dashboard/staking-total-staked',
    'feature: dashboard/staking-apy',
    'feature: dashboard/staking-min-stake',
    'feature: dashboard/staking-rewards',
  ],
};

export function readLegacyOrder(tab: string): string[] {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const order = parsed[tab];
    if (!Array.isArray(order)) return [];

    return order.filter((key): key is string => typeof key === 'string').flatMap((key) => WIDGET_SPLITS[key] ?? [key]);
  } catch {
    return [];
  }
}
