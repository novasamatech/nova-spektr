import { type CSSProperties } from 'react';

export const FALLBACK_COLORS: [string, ...string[]] = [
  '#5A5FE0', // indigo
  '#1CABA0', // teal
  '#F7931A', // orange
  '#9B59B6', // purple
  '#E6557A', // rose
  '#3498DB', // sky
  '#2ECC71', // emerald
  '#8B8B8B', // gray
];

export const BRAND_COLORS: Record<string, string> = {
  polkadot: '#E6007A',
  kusama: '#000000',
  tether: '#26A17B',
  'usd-coin': '#2775CA',
  ethereum: '#627EEA',
  bitcoin: '#F7931A',
  chainlink: '#2A5ADA',
  acala: '#E40C5B',
  moonbeam: '#53CBC9',
  astar: '#0070EB',
};

export const CHART_TOOLTIP_STYLE: CSSProperties = {
  backgroundColor: 'white',
  border: '1px solid #e2e2e2',
  borderRadius: 8,
  padding: '6px 10px',
  fontSize: 12,
  lineHeight: '18px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
};

export const getColorByPriceId = (priceId: string, fallbackIndex: number): string =>
  BRAND_COLORS[priceId] ?? FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length] ?? FALLBACK_COLORS[0];

export const getColorByIndex = (index: number): string =>
  FALLBACK_COLORS[index % FALLBACK_COLORS.length] ?? FALLBACK_COLORS[0];

export const ALLOCATION_COLORS = {
  transferable: '#53A867',
  reserved: '#F7931A',
  locked: '#64748B',
  vested: '#4649F6',
} as const;

/**
 * Fill for vesting drawn _over_ another allocation segment rather than beside
 * it — see the Vested category in `dashboard-portfolio-overview`.
 *
 * Hatching rather than a flat tint on purpose: a solid block would read as one
 * more slice of the bar, which is exactly the thing it is not. Derived from
 * `ALLOCATION_COLORS.vested`, striped with translucent white so the host
 * segment's own colour stays legible underneath in both themes.
 */
export const VESTED_HATCH = `repeating-linear-gradient(135deg, ${ALLOCATION_COLORS.vested}d9 0 3px, #ffffff59 3px 6px)`;

/**
 * Floor for the {@link VESTED_HATCH} marker (and the segments it sits over): a
 * trace of vesting inside a large balance would otherwise collapse to a
 * sub-pixel span nobody can find.
 */
export const ALLOCATION_MARKER_MIN_PX = 6;
