import { getCurrencyChangeKey } from '../utils';

describe('domains/price/lib/utils', () => {
  test('get correct change key', () => {
    const result = getCurrencyChangeKey('polkadot');

    expect(result).toEqual('polkadot_24h_change');
  });
});
