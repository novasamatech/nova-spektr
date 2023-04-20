import { TEST_ACCOUNT_ID, TEST_ADDRESS } from '@renderer/shared/utils/constants';
import { toAddress } from '../address';

describe('shared/utils/address', () => {
  test('should convert address to Polkadot', () => {
    const address = toAddress(TEST_ACCOUNT_ID, { prefix: 0 });
    expect(address).toEqual(TEST_ADDRESS);
  });

  test('should convert address to Substrate', () => {
    const address = toAddress(TEST_ACCOUNT_ID);
    expect(address).toEqual('5CGQ7BPJZZKNirQgVhzbX9wdkgbnUHtJ5V7FkMXdZeVbXyr9');
  });

  test('should convert address with default prefix', () => {
    const address = toAddress(TEST_ADDRESS);
    expect(address).toEqual('5CGQ7BPJZZKNirQgVhzbX9wdkgbnUHtJ5V7FkMXdZeVbXyr9');
  });

  test('should convert address to specific prefix', () => {
    const address = toAddress(TEST_ADDRESS, { prefix: 0 });
    expect(address).toEqual(TEST_ADDRESS);
  });
});
