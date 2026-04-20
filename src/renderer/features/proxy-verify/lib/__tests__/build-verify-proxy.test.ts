import { TransactionType } from '@/shared/core';
import { ProxyTypes } from '@/shared/core/types/proxy';
import { toAccountId } from '@/shared/lib/utils';
import { RelayChains } from '@/shared/lib/utils/constants';
import { VERIFIABLE_PROXY_TYPES, buildVerifyRemark, isVerifiableProxyType } from '../build-verify-proxy';

const chainId = RelayChains.POLKADOT;
const signatory = toAccountId('0xaaaaaaaa');

describe('features/proxy-verify/lib/build-verify-proxy', () => {
  describe('buildVerifyRemark', () => {
    test('emits a plain system.remark attributed to the signatory; the wrap pipeline handles any proxy/asMulti layering', () => {
      expect(buildVerifyRemark({ chainId, accountId: signatory })).toEqual({
        chainId,
        accountId: signatory,
        type: TransactionType.REMARK,
        args: { remark: '0x' },
      });
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
