import { render, screen } from '@testing-library/react';

import { type Asset } from '@/shared/core';
import { I18Provider } from '@/shared/i18n';

import { AssetBalance } from './AssetBalance';

const DOT = { symbol: 'DOT', precision: 10 } as unknown as Asset;

/** Planck for a whole-token amount, e.g. 6.51894 DOT at precision 10. */
const planck = (tokens: string) => {
  const [whole, fraction = ''] = tokens.split('.');

  return `${whole}${fraction.padEnd(10, '0')}`;
};

const renderBalance = (props: Partial<Parameters<typeof AssetBalance>[0]>) => {
  render(
    <I18Provider>
      <AssetBalance asset={DOT} {...props} />
    </I18Provider>,
  );

  return screen.getByTestId('AssetBalance').textContent?.replace(/\s+/g, ' ').trim();
};

describe('shared/ui-entities/AssetBalance', () => {
  it('shows the app default precision when no cap is asked for', () => {
    expect(renderBalance({ value: planck('6.51894') })).toBe('6.51894 DOT');
  });

  it('caps the decimals when asked', () => {
    expect(renderBalance({ value: planck('6.51894'), maxDecimals: 4 })).toBe('6.5189 DOT');
  });

  it('never invents precision the amount does not have', () => {
    expect(renderBalance({ value: planck('12.5'), maxDecimals: 4 })).toBe('12.5 DOT');
  });

  it('renders an amount below the cap as "less than", not as a rounded zero', () => {
    expect(renderBalance({ value: planck('0.000002'), maxDecimals: 4 })).toBe('<0.0001 DOT');
  });

  it('keeps a real zero a zero', () => {
    expect(renderBalance({ value: '0', maxDecimals: 4 })).toBe('0 DOT');
  });

  it('spells out thousands by default', () => {
    expect(renderBalance({ value: planck('242026.52') })).toBe('242,026.52 DOT');
  });

  it('abbreviates thousands when the caller opts in', () => {
    expect(renderBalance({ value: planck('242026.52'), shorthands: { K: true } })).toBe('242.02K DOT');
  });
});
