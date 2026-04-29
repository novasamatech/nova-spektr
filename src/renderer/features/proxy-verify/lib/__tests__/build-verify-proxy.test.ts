import { TransactionType } from '@/shared/core';
import { ProxyTypes } from '@/shared/core/types/proxy';
import { toAccountId } from '@/shared/lib/utils';
import { RelayChains } from '@/shared/lib/utils/constants';
import { VERIFIABLE_PROXY_TYPES, buildVerifyProxyCall, isVerifiableProxyType } from '../build-verify-proxy';

const chainId = RelayChains.POLKADOT;
const delegate = toAccountId('0xaaaaaaaa');
const pure = toAccountId('0xbbbbbbbb');

describe('features/proxy-verify/lib/build-verify-proxy', () => {
  describe('buildVerifyProxyCall', () => {
    test('wraps system.remark in proxy.proxy attributed to the delegate; asMulti is layered by the wrap pipeline', () => {
      expect(
        buildVerifyProxyCall({
          chainId,
          delegateAccountId: delegate,
          pureProxyAccountId: pure,
          proxyType: ProxyTypes.ANY,
        }),
      ).toEqual({
        chainId,
        accountId: delegate,
        type: TransactionType.PROXY,
        args: {
          real: pure,
          forceProxyType: ProxyTypes.ANY,
          transaction: {
            chainId,
            accountId: pure,
            type: TransactionType.REMARK,
            args: { remark: '0x' },
          },
        },
      });
    });

    test('preserves the clicked proxyType in forceProxyType so dispatch picks the right delegation', () => {
      const call = buildVerifyProxyCall({
        chainId,
        delegateAccountId: delegate,
        pureProxyAccountId: pure,
        proxyType: ProxyTypes.NON_TRANSFER,
      });
      expect(call.args.forceProxyType).toBe(ProxyTypes.NON_TRANSFER);
    });
  });

  describe('isVerifiableProxyType / VERIFIABLE_PROXY_TYPES', () => {
    test('only Any and NonTransfer permit system.remark', () => {
      expect(VERIFIABLE_PROXY_TYPES).toEqual(new Set([ProxyTypes.ANY, ProxyTypes.NON_TRANSFER]));
      expect(isVerifiableProxyType(ProxyTypes.ANY)).toBe(true);
      expect(isVerifiableProxyType(ProxyTypes.NON_TRANSFER)).toBe(true);
    });

    test.each([
      ProxyTypes.STAKING,
      ProxyTypes.GOVERNANCE,
      ProxyTypes.AUCTION,
      ProxyTypes.CANCEL_PROXY,
      ProxyTypes.IDENTITY_JUDGEMENT,
      ProxyTypes.NOMINATION_POOLS,
      ProxyTypes.SUDO_BALANCES,
    ])('rejects %s', (proxyType) => {
      expect(isVerifiableProxyType(proxyType)).toBe(false);
    });
  });
});
