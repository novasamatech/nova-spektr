import { TEST_ACCOUNT_ID } from '@renderer/shared/utils/constants';
import { toAddress } from '../address';

describe('shared/utils/address', () => {
  test('should convert address to Polkadot', () => {
    const address = toAddress(TEST_ACCOUNT_ID, { prefix: 0 });
    expect(address).toEqual('1ChFWeNRLarAPRCTM3bfJmncJbSAbSS9yqjueWz7jX7iTVZ');
  });

  test('should convert address to Substrate', () => {
    const address = toAddress(TEST_ACCOUNT_ID);
    expect(address).toEqual('5CGQ7BPJZZKNirQgVhzbX9wdkgbnUHtJ5V7FkMXdZeVbXyr9');
  });
});
