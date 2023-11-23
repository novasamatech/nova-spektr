import { TEST_ACCOUNT_ID, TEST_ADDRESS } from '@shared/lib/utils';
import { toAddress } from '../address';

describe('shared/lib/utils/derivation', () => {
  test('should convert address to Polkadot', () => {
    const address = toAddress(TEST_ACCOUNT_ID, { prefix: 0 });
    expect(address).toEqual(TEST_ADDRESS);
  });
});
