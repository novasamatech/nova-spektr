import { TransactionType } from '@/shared/core';
import { ProxyTypes } from '@/shared/core/types/proxy';
import { toAccountId } from '@/shared/lib/utils';
import { RelayChains } from '@/shared/lib/utils/constants';
import {
  VERIFIABLE_PROXY_TYPES,
  buildVerifyProxyCore,
  buildVerifyRemark,
  isVerifiableProxyType,
} from '../build-verify-proxy';

const chainId = RelayChains.POLKADOT;
const proxy = toAccountId('0xaaaaaaaa');
const pureProxy = toAccountId('0xbbbbbbbb');

describe('features/proxy-verify/lib/build-verify-proxy', () => {
  describe('buildVerifyRemark', () => {
    test('emits an empty-bytes REMARK attributed to the proxy account', () => {
      expect(buildVerifyRemark({ chainId, accountId: proxy })).toEqual({
        chainId,
        accountId: proxy,
        type: TransactionType.REMARK,
        args: { remark: '0x' },
      });
    });
  });

  describe('buildVerifyProxyCore', () => {
    test('wraps system.remark in proxy.proxy with the proxy account as signer', () => {
      const tx = buildVerifyProxyCore({
        chainId,
        proxyAccountId: proxy,
        pureProxyAccountId: pureProxy,
        proxyType: ProxyTypes.ANY,
      });

      expect(tx).toEqual({
        chainId,
        accountId: proxy,
        type: TransactionType.PROXY,
        args: {
          real: pureProxy,
          forceProxyType: ProxyTypes.ANY,
          transaction: {
            chainId,
            accountId: proxy,
            type: TransactionType.REMARK,
            args: { remark: '0x' },
          },
        },
      });
    });

    test('does not batch or apply asDerivative — the indexer only detects bare proxy.proxy or the first batch element', () => {
      const tx = buildVerifyProxyCore({
        chainId,
        proxyAccountId: proxy,
        pureProxyAccountId: pureProxy,
        proxyType: ProxyTypes.NON_TRANSFER,
      });

      expect(tx.type).toBe(TransactionType.PROXY);
      expect(tx.args).toHaveProperty('transaction.type', TransactionType.REMARK);
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
