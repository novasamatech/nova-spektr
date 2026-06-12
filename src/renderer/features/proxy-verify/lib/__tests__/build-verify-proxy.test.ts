import { TransactionType } from '@/shared/core';
import { ProxyTypes } from '@/shared/core/types/proxy';
import { toAccountId } from '@/shared/lib/utils';
import { RelayChains } from '@/shared/lib/utils/constants';
import { VERIFY_PROXY_REMARK_KIND, parseVerifyProxyMarker } from '@/shared/transactions';
import { VERIFIABLE_PROXY_TYPES, buildVerifyProxyCall, isVerifiableProxyType } from '../build-verify-proxy';

const chainId = RelayChains.POLKADOT;
const delegate = toAccountId('0xaaaaaaaa');
const pure = toAccountId('0xbbbbbbbb');

describe('features/proxy-verify/lib/build-verify-proxy', () => {
  describe('buildVerifyProxyCall', () => {
    test('wraps system.remarkWithEvent(<marker>) in proxy.proxy attributed to the delegate; asMulti is layered by the wrap pipeline', () => {
      const call = buildVerifyProxyCall({
        chainId,
        delegateAccountId: delegate,
        pureProxyAccountId: pure,
        proxyType: ProxyTypes.ANY,
      });

      expect(call.chainId).toBe(chainId);
      expect(call.accountId).toBe(delegate);
      expect(call.type).toBe(TransactionType.PROXY);
      expect(call.args.real).toBe(pure);
      expect(call.args.forceProxyType).toBe(ProxyTypes.ANY);

      const inner = call.args.transaction;
      expect(inner.chainId).toBe(chainId);
      expect(inner.accountId).toBe(pure);
      expect(inner.type).toBe(TransactionType.REMARK_WITH_EVENT);

      const marker = parseVerifyProxyMarker(inner.args.remark);
      expect(marker).toEqual({
        kind: VERIFY_PROXY_REMARK_KIND,
        delegateAccountId: delegate,
        pureProxyAccountId: pure,
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

    test('embeds remark text into the marker payload when provided', () => {
      const call = buildVerifyProxyCall({
        chainId,
        delegateAccountId: delegate,
        pureProxyAccountId: pure,
        proxyType: ProxyTypes.ANY,
        remark: 'annual audit',
      });

      const inner = call.args.transaction;
      const marker = parseVerifyProxyMarker(inner.args.remark);
      expect(marker?.remark).toBe('annual audit');
    });

    test('omits remark key from marker payload when remark is not provided', () => {
      const call = buildVerifyProxyCall({
        chainId,
        delegateAccountId: delegate,
        pureProxyAccountId: pure,
        proxyType: ProxyTypes.ANY,
      });

      const inner = call.args.transaction;
      const marker = parseVerifyProxyMarker(inner.args.remark);
      expect(marker).not.toBeNull();
      expect('remark' in marker!).toBe(false);
    });

    test('parses legacy `memo` key from in-flight pings as remark text', () => {
      const legacyPayload = JSON.stringify({
        kind: VERIFY_PROXY_REMARK_KIND,
        delegateAccountId: delegate,
        pureProxyAccountId: pure,
        memo: 'annual audit',
      });

      const marker = parseVerifyProxyMarker(legacyPayload);
      expect(marker?.remark).toBe('annual audit');
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
