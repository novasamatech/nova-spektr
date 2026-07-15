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
  locked: '#64748B',
  reserved: '#F7931A',
  vested: '#4649F6',
} as const;
