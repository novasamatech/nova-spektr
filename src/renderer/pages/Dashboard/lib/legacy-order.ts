const LEGACY_KEY = 'dashboard-widget-order';

export function readLegacyOrder(tab: string): string[] {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const order = parsed[tab];

    return Array.isArray(order) ? order.filter((key): key is string => typeof key === 'string') : [];
  } catch {
    return [];
  }
}
