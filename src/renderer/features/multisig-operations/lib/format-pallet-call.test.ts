import { describe, expect, it } from 'vitest';

import { formatPalletCall } from './format-pallet-call';

describe('formatPalletCall', () => {
  it('capitalises pallet and call and joins them with a middle dot', () => {
    expect(formatPalletCall('balances', 'transferKeepAlive')).toBe('Balances · TransferKeepAlive');
    expect(formatPalletCall('utility', 'batchAll')).toBe('Utility · BatchAll');
    expect(formatPalletCall('convictionVoting', 'vote')).toBe('ConvictionVoting · Vote');
  });

  it('keeps already-capitalised input untouched', () => {
    expect(formatPalletCall('Balances', 'TransferKeepAlive')).toBe('Balances · TransferKeepAlive');
  });

  it('returns null when either part is missing', () => {
    expect(formatPalletCall(null, 'vote')).toBeNull();
    expect(formatPalletCall('balances', undefined)).toBeNull();
    expect(formatPalletCall('', '')).toBeNull();
  });
});
