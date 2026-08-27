import {
  type DecodedTransaction,
  type HexString,
  type MultisigAccount,
  AccountType,
  CryptoType,
  SigningType,
} from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { createAccountId, kusamaChainId, polkadotChain } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accountService } from '../account/service';
import { type AnyAccount } from '../account/types';

import { CONTACT_MULTISIG_WALLET_ID } from './contact-multisigs';
import { multisigOperationService } from './service';
import { type MultisigEvent, type MultisigOperation, MultisigEventStatus } from './types';

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

    it('keeps the indexer call-data mismatch flag when the live side has no call data', () => {
      const offChain = makeOperation({ callDataMismatch: true });
      const live = makeOperation();

      const [merged] = multisigOperationService.mergeMultisigOperations([offChain], [live]);

      expect(merged?.callDataMismatch).toBe(true);
    });

    it('drops the call-data mismatch flag once valid call data is known', () => {
      const offChain = makeOperation({ callDataMismatch: true });
      const live = makeOperation({ callData: '0x0500' as HexString });

      const [merged] = multisigOperationService.mergeMultisigOperations([offChain], [live]);

      expect(merged?.callData).toBe('0x0500');
      expect(merged?.callDataMismatch).toBeUndefined();
    });

    it('clears awaitingOutcome once the merged status is resolved', () => {
      const offChain = makeOperation({ status: 'executed' });
      const live = makeOperation({ awaitingOutcome: true });

      const [merged] = multisigOperationService.mergeMultisigOperations([offChain], [live]);

      expect(merged?.status).toBe('executed');
      expect(merged?.awaitingOutcome).toBeUndefined();
    });

    it('keeps awaitingOutcome while both sides are still pending', () => {
      const oldPending = makeOperation({ events: [makeEvent('e-init', 100)] });
      const updatedAwaiting = makeOperation({ awaitingOutcome: true, events: [makeEvent('e-init', 100)] });

      const [merged] = multisigOperationService.mergeMultisigOperations([oldPending], [updatedAwaiting]);

      expect(merged?.status).toBe('pending');
      expect(merged?.awaitingOutcome).toBe(true);
    });

    it('prefers the old-side event content on id collision (real per-event block over storage-derived)', () => {
      const offChain = makeOperation({ status: 'executed', events: [makeEvent('e-middle', 200)] });
      const live = makeOperation({ events: [makeEvent('e-middle', 100)] });

      const [merged] = multisigOperationService.mergeMultisigOperations([offChain], [live]);

      expect(merged?.events).toHaveLength(1);
      expect(merged?.events[0]?.blockCreated).toBe(200);
    });
  });

  describe('own signatories', () => {
    const sigA = createAccountId('actionable-a');
    const sigB = createAccountId('actionable-b');
    const sigC = createAccountId('actionable-c');
    const multisigId = createAccountId('actionable-multisig');

    const makeApproveEvent = (accountId: AccountId): MultisigEvent =>
      ({
        id: `approve-${accountId}`,
        accountId,
        status: MultisigEventStatus.Approve,
        blockCreated: 100,
        indexCreated: 0,
        timestamp: 0,
      }) as unknown as MultisigEvent;

    const makeMultisigAccount = (
      signatories: { accountId: AccountId; id?: number }[],
      threshold = 2,
    ): MultisigAccount => ({
      id: 'multisig-account',
      type: 'universal',
      name: 'multisig',
      walletId: 100,
      accountId: multisigId,
      accountType: AccountType.MULTISIG,
      cryptoType: CryptoType.SR25519,
      signingType: SigningType.MULTISIG,
      signatories,
      threshold,
      createdAt: 0,
    });

    const makeWalletAccount = (
      accountId: AccountId,
      walletId: number,
      signingType: SigningType = SigningType.POLKADOT_VAULT,
    ): AnyAccount => ({
      id: `acct-${accountId}-${walletId}`,
      type: 'universal',
      name: 'signatory',
      walletId,
      accountId,
      cryptoType: CryptoType.SR25519,
      signingType,
      createdAt: 0,
    });

    // The anyOf has no registered handlers in unit tests, so availability would
    // resolve to `false` for everything — seed the same chain-matching handler
    // the account domain tests use.
    beforeEach(() => {
      accountService.accountAvailabilityOnChainAnyOf.registerHandler({
        body: ({ account, chain }) =>
          accountService.isChainAccount(account) ? account.chainId === chain.chainId : true,
        available: () => true,
      });
    });

    afterEach(() => {
      accountService.accountAvailabilityOnChainAnyOf.resetHandlers();
    });

    it('returns all eligible signatory accounts so the user can pick one to sign with', () => {
      const multisig = makeMultisigAccount([{ accountId: sigA }, { accountId: sigB }, { accountId: sigC }]);
      const accountA = makeWalletAccount(sigA, 1);
      const accountB = makeWalletAccount(sigB, 2);
      // sigC has no wallet account — not controlled by the user

      const actionable = multisigOperationService.findActionableSignatories(
        { events: [] },
        multisig,
        [accountA, accountB],
        polkadotChain,
      );

      expect(actionable).toEqual([accountA, accountB]);
    });

    it('returns every wallet account holding the same signatory key', () => {
      const multisig = makeMultisigAccount([{ accountId: sigA }]);
      const vaultAccount = makeWalletAccount(sigA, 1);
      const walletConnectAccount = makeWalletAccount(sigA, 2, SigningType.WALLET_CONNECT);

      const actionable = multisigOperationService.findActionableSignatories(
        { events: [] },
        multisig,
        [vaultAccount, walletConnectAccount],
        polkadotChain,
      );

      expect(actionable).toEqual([vaultAccount, walletConnectAccount]);
    });

    it('excludes signatories that already approved', () => {
      const multisig = makeMultisigAccount([{ accountId: sigA }, { accountId: sigB }]);
      const accountA = makeWalletAccount(sigA, 1);
      const accountB = makeWalletAccount(sigB, 2);

      const actionable = multisigOperationService.findActionableSignatories(
        { events: [makeApproveEvent(sigA)] },
        multisig,
        [accountA, accountB],
        polkadotChain,
      );

      expect(actionable).toEqual([accountB]);
    });

    it('excludes watch-only accounts', () => {
      const multisig = makeMultisigAccount([{ accountId: sigA }, { accountId: sigB }]);
      const watchOnlyA = makeWalletAccount(sigA, 1, SigningType.WATCH_ONLY);
      const accountB = makeWalletAccount(sigB, 2);

      const actionable = multisigOperationService.findActionableSignatories(
        { events: [] },
        multisig,
        [watchOnlyA, accountB],
        polkadotChain,
      );

      expect(actionable).toEqual([accountB]);
    });

    it('excludes accounts not available on the operation chain', () => {
      const multisig = makeMultisigAccount([{ accountId: sigA }, { accountId: sigB }]);
      // sigA lives on Kusama only — checked against Polkadot it must drop out
      const kusamaOnlyA: AnyAccount = {
        id: `acct-${sigA}-kusama`,
        type: 'chain',
        name: 'signatory',
        walletId: 1,
        chainId: kusamaChainId,
        accountId: sigA,
        cryptoType: CryptoType.SR25519,
        signingType: SigningType.POLKADOT_VAULT,
        createdAt: 0,
      };
      const accountB = makeWalletAccount(sigB, 2);

      const actionable = multisigOperationService.findActionableSignatories(
        { events: [] },
        multisig,
        [kusamaOnlyA, accountB],
        polkadotChain,
      );

      expect(actionable).toEqual([accountB]);
    });

    it('respects a signatory pinned to a specific wallet', () => {
      // Signatory entry pins walletId 2 — the same key held in wallet 1 must not match
      const multisig = makeMultisigAccount([{ accountId: sigA, id: 2 }]);
      const wrongWallet = makeWalletAccount(sigA, 1);
      const pinnedWallet = makeWalletAccount(sigA, 2);

      const actionable = multisigOperationService.findActionableSignatories(
        { events: [] },
        multisig,
        [wrongWallet, pinnedWallet],
        polkadotChain,
      );

      expect(actionable).toEqual([pinnedWallet]);
    });

    it('returns empty when no signatory can act', () => {
      const multisig = makeMultisigAccount([{ accountId: sigA }, { accountId: sigB }]);
      const accountA = makeWalletAccount(sigA, 1);
      const watchOnlyB = makeWalletAccount(sigB, 2, SigningType.WATCH_ONLY);

      const actionable = multisigOperationService.findActionableSignatories(
        { events: [makeApproveEvent(sigA)] },
        multisig,
        [accountA, watchOnlyB],
        polkadotChain,
      );

      expect(actionable).toEqual([]);
    });

    it('returns empty when the chain is unknown', () => {
      const multisig = makeMultisigAccount([{ accountId: sigA }]);
      const accountA = makeWalletAccount(sigA, 1);

      expect(multisigOperationService.findActionableSignatories({ events: [] }, multisig, [accountA], null)).toEqual(
        [],
      );
    });

    describe('findOwnSignatories', () => {
      it('returns the signatories backed by a signing account available on the chain, in multisig order', () => {
        const multisig = makeMultisigAccount([{ accountId: sigA }, { accountId: sigB }, { accountId: sigC }]);
        const accountB = makeWalletAccount(sigB, 2);
        const accountA = makeWalletAccount(sigA, 1);

        const own = multisigOperationService.findOwnSignatories(multisig, [accountB, accountA], polkadotChain);

        expect(own).toEqual([{ accountId: sigA }, { accountId: sigB }]);
      });

      it('does not count a watch-only account as owning the signatory', () => {
        const multisig = makeMultisigAccount([{ accountId: sigA }, { accountId: sigB }]);
        const watchOnlyA = makeWalletAccount(sigA, 1, SigningType.WATCH_ONLY);
        const accountB = makeWalletAccount(sigB, 2);

        const own = multisigOperationService.findOwnSignatories(multisig, [watchOnlyA, accountB], polkadotChain);

        expect(own).toEqual([{ accountId: sigB }]);
      });

      it('does not count a key that is not available on the operation chain', () => {
        const multisig = makeMultisigAccount([{ accountId: sigA }, { accountId: sigB }]);
        const kusamaOnlyA: AnyAccount = {
          id: `acct-${sigA}-kusama`,
          type: 'chain',
          name: 'signatory',
          walletId: 1,
          chainId: kusamaChainId,
          accountId: sigA,
          cryptoType: CryptoType.SR25519,
          signingType: SigningType.POLKADOT_VAULT,
          createdAt: 0,
        };
        const accountB = makeWalletAccount(sigB, 2);

        const own = multisigOperationService.findOwnSignatories(multisig, [kusamaOnlyA, accountB], polkadotChain);

        expect(own).toEqual([{ accountId: sigB }]);
      });

      it('returns empty when the chain is unknown', () => {
        const multisig = makeMultisigAccount([{ accountId: sigA }]);

        expect(multisigOperationService.findOwnSignatories(multisig, [makeWalletAccount(sigA, 1)], null)).toEqual([]);
      });
    });

    describe('hasSignedWithAllOwnSignatories', () => {
      it('is true once every own signatory has approved', () => {
        const multisig = makeMultisigAccount([{ accountId: sigA }, { accountId: sigB }, { accountId: sigC }]);
        const accountA = makeWalletAccount(sigA, 1);
        const accountB = makeWalletAccount(sigB, 2);

        const signed = multisigOperationService.hasSignedWithAllOwnSignatories(
          { events: [makeApproveEvent(sigA), makeApproveEvent(sigB)] },
          multisig,
          [accountA, accountB],
          polkadotChain,
        );

        expect(signed).toBe(true);
      });

      it('is false while an own signatory is still pending', () => {
        const multisig = makeMultisigAccount([{ accountId: sigA }, { accountId: sigB }]);
        const accountA = makeWalletAccount(sigA, 1);
        const accountB = makeWalletAccount(sigB, 2);

        const signed = multisigOperationService.hasSignedWithAllOwnSignatories(
          { events: [makeApproveEvent(sigA)] },
          multisig,
          [accountA, accountB],
          polkadotChain,
        );

        expect(signed).toBe(false);
      });

      it('is false when the user owns no signatory', () => {
        const multisig = makeMultisigAccount([{ accountId: sigA }, { accountId: sigB }]);
        const watchOnlyA = makeWalletAccount(sigA, 1, SigningType.WATCH_ONLY);

        const signed = multisigOperationService.hasSignedWithAllOwnSignatories(
          { events: [makeApproveEvent(sigA)] },
          multisig,
          [watchOnlyA],
          polkadotChain,
        );

        expect(signed).toBe(false);
      });

      it('ignores an own key that is not available on the chain, matching what findActionableSignatories offers', () => {
        // sigA approved; the user also holds sigB, but only as a Kusama-bound key.
        // On Polkadot there is nothing left to sign with — Approve is hidden, so
        // the signed state must show instead of a blank cell.
        const multisig = makeMultisigAccount([{ accountId: sigA }, { accountId: sigB }]);
        const accountA = makeWalletAccount(sigA, 1);
        const kusamaOnlyB: AnyAccount = {
          id: `acct-${sigB}-kusama`,
          type: 'chain',
          name: 'signatory',
          walletId: 2,
          chainId: kusamaChainId,
          accountId: sigB,
          cryptoType: CryptoType.SR25519,
          signingType: SigningType.POLKADOT_VAULT,
          createdAt: 0,
        };
        const op = { events: [makeApproveEvent(sigA)] };

        expect(
          multisigOperationService.findActionableSignatories(op, multisig, [accountA, kusamaOnlyB], polkadotChain),
        ).toEqual([]);
        expect(
          multisigOperationService.hasSignedWithAllOwnSignatories(op, multisig, [accountA, kusamaOnlyB], polkadotChain),
        ).toBe(true);
      });

      it('is false when the chain is unknown', () => {
        const multisig = makeMultisigAccount([{ accountId: sigA }]);

        expect(
          multisigOperationService.hasSignedWithAllOwnSignatories(
            { events: [makeApproveEvent(sigA)] },
            multisig,
            [makeWalletAccount(sigA, 1)],
            null,
          ),
        ).toBe(false);
      });
    });

    describe('needsUserSignature', () => {
      const makeOperation = (overrides: Partial<MultisigOperation> = {}) =>
        ({ status: 'pending', events: [], ...overrides }) as MultisigOperation;

      // The user holds only sigA; sigB belongs to someone else.
      const multisig = makeMultisigAccount([{ accountId: sigA }, { accountId: sigB }]);
      const accountA = makeWalletAccount(sigA, 1);

      it('is true while an own signatory still has to act', () => {
        expect(multisigOperationService.needsUserSignature(makeOperation(), multisig, [accountA], polkadotChain)).toBe(
          true,
        );
      });

      it('is false once every own signatory has approved', () => {
        const op = makeOperation({ events: [makeApproveEvent(sigA)] });

        expect(multisigOperationService.needsUserSignature(op, multisig, [accountA], polkadotChain)).toBe(false);
      });

      it('stays true while another own signatory has not approved', () => {
        const accountB = makeWalletAccount(sigB, 2);
        const op = makeOperation({ events: [makeApproveEvent(sigA)] });

        expect(multisigOperationService.needsUserSignature(op, multisig, [accountA, accountB], polkadotChain)).toBe(
          true,
        );
      });

      it('is false for an operation awaiting its on-chain outcome', () => {
        const op = makeOperation({ awaitingOutcome: true });

        expect(multisigOperationService.needsUserSignature(op, multisig, [accountA], polkadotChain)).toBe(false);
      });

      it('is false for a contact multisig (no local signatory keys)', () => {
        const contactMultisig = { ...multisig, walletId: CONTACT_MULTISIG_WALLET_ID };

        expect(
          multisigOperationService.needsUserSignature(makeOperation(), contactMultisig, [accountA], polkadotChain),
        ).toBe(false);
      });

      it('is false for a resolved operation', () => {
        for (const status of ['executed', 'cancelled'] as const) {
          expect(
            multisigOperationService.needsUserSignature(makeOperation({ status }), multisig, [accountA], polkadotChain),
          ).toBe(false);
        }
      });

      it('is false when the chain is unknown', () => {
        expect(multisigOperationService.needsUserSignature(makeOperation(), multisig, [accountA], undefined)).toBe(
          false,
        );
      });
    });
  });
});
