import { type DecodedTransaction, CryptoType } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';

import { multisigOperationService } from './service';
import { type MultisigEvent, type MultisigOperation } from './types';

const PROXIED_ACCOUNT = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

const makeDecodedTransaction = (
  section: string,
  method: string,
  args: Record<string, unknown> = {},
): DecodedTransaction => ({
  section,
  method,
  args,
  chainId: '0x00' as any,
  accountId: '0x00' as any,
});

describe('multisig operation service', () => {
  it('should generate SS58 multisig address', () => {
    const multisigAccount = multisigOperationService.getMultisigAccountId(
      [
        toAccountId('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'),
        toAccountId('5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'),
        toAccountId('5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y'),
      ],
      2,
      CryptoType.SR25519,
    );

    expect(multisigAccount).toEqual(toAccountId('5DjYJStmdZ2rcqXbXGX7TW85JsrW6uG4y9MUcLq2BoPMpRA7'));
  });

  it('should generate evm multisig address', () => {
    const multisigAccount = multisigOperationService.getMultisigAccountId(
      [
        toAccountId('0xC60eFE26b9b92380D1b2c479472323eC35F0f0aB'),
        toAccountId('0x61d8c5647f4181f2c35996c62a6272967f5739a8'),
        toAccountId('0xaCCaCE4056A930745218328BF086369Fbd61c212'),
      ],
      2,
      CryptoType.ETHEREUM,
    );

    expect(multisigAccount).toEqual('0xb4e55b61678623fd5ece9c24e79d6c0532bee057');
  });

  describe('extractProxiedAccountId', () => {
    it('should return undefined for null transaction', () => {
      expect(multisigOperationService.extractProxiedAccountId(null)).toBeUndefined();
    });

    it('should extract account from direct proxy.proxy call', () => {
      const tx = makeDecodedTransaction('proxy', 'proxy', { real: PROXIED_ACCOUNT });
      expect(multisigOperationService.extractProxiedAccountId(tx)).toEqual(toAccountId(PROXIED_ACCOUNT));
    });

    it('should return undefined when proxy.proxy has non-string real arg', () => {
      const tx = makeDecodedTransaction('proxy', 'proxy', { real: 42 });
      expect(multisigOperationService.extractProxiedAccountId(tx)).toBeUndefined();
    });

    it('should return undefined when proxy.proxy has no real arg', () => {
      const tx = makeDecodedTransaction('proxy', 'proxy', {});
      expect(multisigOperationService.extractProxiedAccountId(tx)).toBeUndefined();
    });

    it('should extract account from utility.batchAll wrapping proxy.proxy', () => {
      const tx = makeDecodedTransaction('utility', 'batchAll', {
        transactions: [makeDecodedTransaction('proxy', 'proxy', { real: PROXIED_ACCOUNT })],
      });
      expect(multisigOperationService.extractProxiedAccountId(tx)).toEqual(toAccountId(PROXIED_ACCOUNT));
    });

    it('should extract account from utility.batch wrapping proxy.proxy', () => {
      const tx = makeDecodedTransaction('utility', 'batch', {
        transactions: [makeDecodedTransaction('proxy', 'proxy', { real: PROXIED_ACCOUNT })],
      });
      expect(multisigOperationService.extractProxiedAccountId(tx)).toEqual(toAccountId(PROXIED_ACCOUNT));
    });

    it('should extract account from utility.forceBatch wrapping proxy.proxy', () => {
      const tx = makeDecodedTransaction('utility', 'forceBatch', {
        transactions: [makeDecodedTransaction('proxy', 'proxy', { real: PROXIED_ACCOUNT })],
      });
      expect(multisigOperationService.extractProxiedAccountId(tx)).toEqual(toAccountId(PROXIED_ACCOUNT));
    });

    it('should return undefined for batch with empty transactions', () => {
      const tx = makeDecodedTransaction('utility', 'batchAll', { transactions: [] });
      expect(multisigOperationService.extractProxiedAccountId(tx)).toBeUndefined();
    });

    it('should return undefined for batch with non-array transactions', () => {
      const tx = makeDecodedTransaction('utility', 'batchAll', { transactions: 'not an array' });
      expect(multisigOperationService.extractProxiedAccountId(tx)).toBeUndefined();
    });

    it('should return undefined for batch where first tx is not proxy.proxy', () => {
      const tx = makeDecodedTransaction('utility', 'batchAll', {
        transactions: [makeDecodedTransaction('balances', 'transferKeepAlive', { dest: '0x00', value: '1000' })],
      });
      expect(multisigOperationService.extractProxiedAccountId(tx)).toBeUndefined();
    });

    it('should return undefined for simple balances.transfer', () => {
      const tx = makeDecodedTransaction('balances', 'transferKeepAlive', { dest: '0x00', value: '1000' });
      expect(multisigOperationService.extractProxiedAccountId(tx)).toBeUndefined();
    });

    it('should return undefined for proxy.addProxy (not proxy.proxy)', () => {
      const tx = makeDecodedTransaction('proxy', 'addProxy', {
        delegate: PROXIED_ACCOUNT,
        proxyType: 'Any',
        delay: 0,
      });
      expect(multisigOperationService.extractProxiedAccountId(tx)).toBeUndefined();
    });

    it('should return undefined for staking operations', () => {
      const tx = makeDecodedTransaction('staking', 'bond', { value: '1000', payee: 'Staked' });
      expect(multisigOperationService.extractProxiedAccountId(tx)).toBeUndefined();
    });

    it('should NOT detect flex for utility.batchAll containing as_derivative > force_batch > proxy.add_proxy', () => {
      const makeAddProxyCall = (delegate: string): DecodedTransaction =>
        makeDecodedTransaction('proxy', 'addProxy', {
          delegate,
          proxyType: 'Staking',
          delay: 0,
        });

      const makeAsDerivativeCall = (index: number): DecodedTransaction =>
        makeDecodedTransaction('utility', 'asDerivative', {
          index,
          call: makeDecodedTransaction('utility', 'forceBatch', {
            transactions: [
              makeAddProxyCall('0xf67ceef1fef1a1419a67a10b7ffa429c41f8ba70f51f2e222606fa2a8edcbd4f'),
              makeAddProxyCall('0x89476626a4400ad0b49be9aae39db9d1cfa93e779088ad9bfe8e14e6cc0cb723'),
            ],
          }),
        });

      const tx = makeDecodedTransaction('utility', 'batchAll', {
        transactions: [
          makeAsDerivativeCall(0),
          makeAsDerivativeCall(1),
          makeAsDerivativeCall(2),
          makeAsDerivativeCall(3),
          makeAsDerivativeCall(4),
          makeAsDerivativeCall(5),
        ],
      });

      expect(multisigOperationService.extractProxiedAccountId(tx)).toBeUndefined();
    });

    it('should NOT detect flex for utility.forceBatch wrapping proxy.addProxy (not proxy.proxy)', () => {
      const tx = makeDecodedTransaction('utility', 'forceBatch', {
        transactions: [
          makeDecodedTransaction('proxy', 'addProxy', {
            delegate: PROXIED_ACCOUNT,
            proxyType: 'Any',
            delay: 0,
          }),
        ],
      });
      expect(multisigOperationService.extractProxiedAccountId(tx)).toBeUndefined();
    });

    it('should handle multiple proxy.proxy calls in batch — only checks first', () => {
      const otherAccount = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const tx = makeDecodedTransaction('utility', 'batchAll', {
        transactions: [
          makeDecodedTransaction('proxy', 'proxy', { real: PROXIED_ACCOUNT }),
          makeDecodedTransaction('proxy', 'proxy', { real: otherAccount }),
        ],
      });
      expect(multisigOperationService.extractProxiedAccountId(tx)).toEqual(toAccountId(PROXIED_ACCOUNT));
    });

    it('should return undefined for utility.asDerivative (not a batch method)', () => {
      const tx = makeDecodedTransaction('utility', 'asDerivative', {
        index: 0,
        call: makeDecodedTransaction('proxy', 'proxy', { real: PROXIED_ACCOUNT }),
      });
      expect(multisigOperationService.extractProxiedAccountId(tx)).toBeUndefined();
    });
  });

  describe('mergeMultisigOperations', () => {
    const makeEvent = (id: string, blockCreated: number): MultisigEvent =>
      ({
        id,
        accountId: '0x00',
        status: 'approve',
        blockCreated,
        indexCreated: 0,
        timestamp: 0,
      }) as unknown as MultisigEvent;

    const makeOperation = (overrides: Partial<MultisigOperation> = {}): MultisigOperation =>
      ({
        id: 'op-1',
        status: 'pending',
        callHash: '0xhash',
        callData: null,
        transaction: null,
        section: null,
        method: null,
        blockCreated: 100,
        indexCreated: 0,
        events: [],
        timestamp: 0,
        ...overrides,
      }) as unknown as MultisigOperation;

    it('unions events from both sides on merge', () => {
      // Indexer knows the initiation and the executor's approval; the live
      // snapshot knows the initiation and a middle approval the indexer lost.
      const offChain = makeOperation({
        status: 'executed',
        events: [makeEvent('e-init', 100), makeEvent('e-exec', 300)],
      });
      const live = makeOperation({ events: [makeEvent('e-init', 100), makeEvent('e-middle', 200)] });

      const [merged] = multisigOperationService.mergeMultisigOperations([offChain], [live]);

      expect(merged?.events.map(e => e.id).sort()).toEqual(['e-exec', 'e-init', 'e-middle']);
    });

    it('does not let a pending live version shadow a resolved one', () => {
      const offChain = makeOperation({ status: 'executed', events: [makeEvent('e-init', 100)] });
      const live = makeOperation({ events: [makeEvent('e-init', 100), makeEvent('e-middle', 200)] });

      const [merged] = multisigOperationService.mergeMultisigOperations([offChain], [live]);

      expect(merged?.status).toBe('executed');
    });

    it('keeps the updated side status when it is resolved', () => {
      const offChain = makeOperation({ status: 'executed' });
      const live = makeOperation({ status: 'cancelled' });

      const [merged] = multisigOperationService.mergeMultisigOperations([offChain], [live]);

      expect(merged?.status).toBe('cancelled');
    });

    it('prefers the old-side event content on id collision (real per-event block over storage-derived)', () => {
      const offChain = makeOperation({ status: 'executed', events: [makeEvent('e-middle', 200)] });
      const live = makeOperation({ events: [makeEvent('e-middle', 100)] });

      const [merged] = multisigOperationService.mergeMultisigOperations([offChain], [live]);

      expect(merged?.events).toHaveLength(1);
      expect(merged?.events[0]?.blockCreated).toBe(200);
    });
  });
});
