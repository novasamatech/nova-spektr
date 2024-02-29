import { Chain, Wallet, WalletType } from '@shared/core';
import { proxiesUtils } from '../proxies-utils';

describe('features/proxies/lib/proxies-utils', () => {
  test('should return true if "regular_proxy" is included in chain options', () => {
    const chainWithRegularProxy = { options: ['regular_proxy'] } as Chain;
    const result = proxiesUtils.isRegularProxy(chainWithRegularProxy);

    expect(result).toEqual(true);
  });

  test('should return false if "regular_proxy" is not included in chain options', () => {
    const chainWithoutRegularProxy = { options: ['multisig'] } as Chain;
    const result = proxiesUtils.isRegularProxy(chainWithoutRegularProxy);

    expect(result).toEqual(false);
  });

  test('should return false if chain options is undefined', () => {
    const chainWithUndefinedOptions = {} as Chain;
    const result = proxiesUtils.isRegularProxy(chainWithUndefinedOptions);

    expect(result).toEqual(false);
  });

  test('should be false if proxied is unavailable for watch only wallet', () => {
    const wallet = { id: 1, type: WalletType.WATCH_ONLY } as unknown as Wallet;

    expect(proxiesUtils.isProxiedAvailable(wallet)).toEqual(false);
  });

  test('should be false if proxied is unavailable for proxied wallet', () => {
    const wallet = { id: 1, type: WalletType.PROXIED } as unknown as Wallet;

    expect(proxiesUtils.isProxiedAvailable(wallet)).toEqual(false);
  });

  test('should be true if proxied is available for polkadot vault wallet', () => {
    const wallet = { id: 1, type: WalletType.POLKADOT_VAULT } as unknown as Wallet;

    expect(proxiesUtils.isProxiedAvailable(wallet)).toEqual(true);
  });
});
