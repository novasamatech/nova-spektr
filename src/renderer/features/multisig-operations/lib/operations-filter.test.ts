import { describe, expect, test } from 'vitest';

import {
  type Chain,
  type Contact,
  type Wallet,
  AccountNameType,
  CryptoType,
  SigningType,
  TransactionType,
  WalletType,
} from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { type AnyAccount, type MultisigOperation } from '@/domains/network';
import { type OperationSearchRow, type SearchResolvers, searchOperationRows } from '@/aggregates/operations-search';

import {
  type OperationsFilterContext,
  buildOperationSearchRow,
  filterOperation,
  getFilterableTxType,
  getWalletSearchEntries,
  matchesDateRange,
  matchesNetwork,
  matchesProxyType,
  matchesStatus,
  matchesTab,
  matchesTxType,
} from './operations-filter';

const MOCK_CHAIN_ID = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';
const MOCK_ACCOUNT_ID = '5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY' as never;

const createMockOperation = (overrides?: Partial<MultisigOperation>): MultisigOperation =>
  ({
    id: 'op-1',
    status: 'pending',
    chainId: MOCK_CHAIN_ID,
    multisigAccountId: MOCK_ACCOUNT_ID,
    depositor: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' as never,
    callHash: '0xabc123',
    callData: '0xdef',
    method: 'transfer',
    section: 'balances',
    blockCreated: 100,
    indexCreated: 1,
    timestamp: new Date('2024-01-15').getTime(),
    events: [],
    transaction: null,
    ...overrides,
  }) as MultisigOperation;

const mockMultisigAccount = { accountId: MOCK_ACCOUNT_ID, accountType: 'multisig', walletId: 1 } as never;

const emptyContext: OperationsFilterContext = {
  filters: {
    network: [],
    type: [],
    proxyType: [],
    status: [],
    searchQuery: '',
  },
  tab: 'pending',
  hiddenIds: [],
  searchMatchedIds: null,
  isScopeMerged: false,
};

describe('operations-filter', () => {
  describe('getFilterableTxType', () => {
    test('returns UNKNOWN_TYPE when operation has no transaction', () => {
      const op = createMockOperation({ transaction: null });
      expect(getFilterableTxType(op)).toBe('UNKNOWN_TYPE');
    });

    test('returns UNKNOWN_TYPE when transaction has no type', () => {
      const op = createMockOperation({
        transaction: { type: undefined, section: '', method: '', args: {} } as never,
      });
      expect(getFilterableTxType(op)).toBe('UNKNOWN_TYPE');
    });

    test('returns TRANSFER for transfer transaction type', () => {
      const op = createMockOperation({
        transaction: {
          type: TransactionType.TRANSFER,
          section: 'balances',
          method: 'transferKeepAlive',
          args: {},
        } as never,
      });
      expect(getFilterableTxType(op)).toBe(TransactionType.TRANSFER);
    });

    test('returns XCM_LIMITED_TRANSFER for XCM transaction type', () => {
      const op = createMockOperation({
        transaction: {
          type: TransactionType.XCM_LIMITED_TRANSFER,
          section: 'xcmPallet',
          method: 'limitedReserveTransferAssets',
          args: {},
        } as never,
      });
      expect(getFilterableTxType(op)).toBe(TransactionType.XCM_LIMITED_TRANSFER);
    });

    test('returns inner type for BATCH_ALL with transfer inside', () => {
      const op = createMockOperation({
        transaction: {
          type: TransactionType.BATCH_ALL,
          section: 'utility',
          method: 'batchAll',
          args: {
            transactions: [
              {
                type: TransactionType.TRANSFER,
                section: 'balances',
                method: 'transfer',
                args: {},
              },
            ],
          },
        } as never,
      });
      expect(getFilterableTxType(op)).toBe(TransactionType.TRANSFER);
    });
  });

  describe('matchesTab', () => {
    test('hidden: returns true when operation is in hiddenIds', () => {
      const op = createMockOperation({ id: 'op-hidden' });
      expect(matchesTab(op, 'hidden', ['op-hidden'])).toBe(true);
    });

    test('hidden: returns false when operation is not in hiddenIds', () => {
      const op = createMockOperation({ id: 'op-visible' });
      expect(matchesTab(op, 'hidden', ['other-id'])).toBe(false);
    });

    test('pending: returns true when not hidden and status is pending', () => {
      const op = createMockOperation({ id: 'op-1', status: 'pending' });
      expect(matchesTab(op, 'pending', [])).toBe(true);
    });

    test('pending: returns false when hidden', () => {
      const op = createMockOperation({ id: 'op-1', status: 'pending' });
      expect(matchesTab(op, 'pending', ['op-1'])).toBe(false);
    });

    test('pending: returns false when not hidden but status is executed', () => {
      expect(matchesTab(createMockOperation({ status: 'executed' }), 'pending', [])).toBe(false);
    });

    test('history: returns true when not hidden and status is executed', () => {
      expect(matchesTab(createMockOperation({ status: 'executed' }), 'history', [])).toBe(true);
    });

    test('history: returns true when not hidden and status is cancelled', () => {
      expect(matchesTab(createMockOperation({ status: 'cancelled' }), 'history', [])).toBe(true);
    });

    test('history: returns true when not hidden and status is error', () => {
      expect(matchesTab(createMockOperation({ status: 'error' }), 'history', [])).toBe(true);
    });

    test('history: returns false when hidden', () => {
      const op = createMockOperation({ id: 'op-1', status: 'executed' });
      expect(matchesTab(op, 'history', ['op-1'])).toBe(false);
    });

    test('history: returns false when not hidden but status is pending', () => {
      expect(matchesTab(createMockOperation({ status: 'pending' }), 'history', [])).toBe(false);
    });
  });

  describe('matchesNetwork', () => {
    const otherChainId = '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe';

    test('returns true when network list is empty', () => {
      const op = createMockOperation();
      expect(matchesNetwork(op, [])).toBe(true);
    });

    test('returns true when chainId is in list', () => {
      const op = createMockOperation();
      expect(matchesNetwork(op, [MOCK_CHAIN_ID])).toBe(true);
    });

    test('returns true when XCM destination is in list', () => {
      const op = createMockOperation({
        transaction: {
          type: TransactionType.XCM_LIMITED_TRANSFER,
          section: 'xcmPallet',
          method: 'limitedReserveTransferAssets',
          args: { destinationChain: otherChainId },
        } as never,
      });
      expect(matchesNetwork(op, [otherChainId])).toBe(true);
    });

    test('returns false when neither chainId nor destination is in list', () => {
      const op = createMockOperation();
      expect(
        matchesNetwork(op, [otherChainId, '0xfc41b9bd8ef8fe64d6c44a895e4471ef95163b1f5e2f0e0e0e0e0e0e0e0e0e0e0']),
      ).toBe(false);
    });
  });

  describe('matchesTxType', () => {
    test('returns true when type list is empty', () => {
      const op = createMockOperation();
      expect(matchesTxType(op, [])).toBe(true);
    });

    test('returns true when operation type is in list', () => {
      const op = createMockOperation({
        transaction: {
          type: TransactionType.TRANSFER,
          section: 'balances',
          method: 'transfer',
          args: {},
        } as never,
      });
      expect(matchesTxType(op, [TransactionType.TRANSFER])).toBe(true);
    });

    test('returns false when operation type is not in list', () => {
      const op = createMockOperation({
        transaction: {
          type: TransactionType.TRANSFER,
          section: 'balances',
          method: 'transfer',
          args: {},
        } as never,
      });
      expect(matchesTxType(op, [TransactionType.BOND])).toBe(false);
    });
  });

  describe('matchesProxyType', () => {
    test('returns true when proxyType list is empty', () => {
      expect(matchesProxyType([], mockMultisigAccount)).toBe(true);
    });

    test('returns false when account is not flexible and proxyType filter is set', () => {
      expect(matchesProxyType(['Any'], mockMultisigAccount)).toBe(false);
    });
  });

  describe('matchesDateRange', () => {
    test('returns true when dateRange is undefined', () => {
      const op = createMockOperation({ timestamp: new Date('2024-01-15').getTime() });
      expect(matchesDateRange(op, undefined)).toBe(true);
    });

    test('returns true when dateRange has no from or to', () => {
      const op = createMockOperation({ timestamp: new Date('2024-01-15').getTime() });
      expect(matchesDateRange(op, { from: undefined, to: undefined })).toBe(true);
    });

    test('returns true when operation date is within from-to range', () => {
      const op = createMockOperation({
        timestamp: new Date('2024-01-15T12:00:00').getTime(),
      });
      expect(
        matchesDateRange(op, {
          from: new Date('2024-01-14'),
          to: new Date('2024-01-16'),
        }),
      ).toBe(true);
    });

    test('returns false when operation date is before range', () => {
      const op = createMockOperation({
        timestamp: new Date('2024-01-10').getTime(),
      });
      expect(
        matchesDateRange(op, {
          from: new Date('2024-01-14'),
          to: new Date('2024-01-16'),
        }),
      ).toBe(false);
    });

    test('returns true when operation date is on or after from (no to)', () => {
      const op = createMockOperation({
        timestamp: new Date('2024-01-15').getTime(),
      });
      expect(matchesDateRange(op, { from: new Date('2024-01-14') })).toBe(true);
    });

    test('interprets UTC-midnight range as local calendar day (Jan 25 includes same-day UTC noon)', () => {
      const opOnJan25 = createMockOperation({
        timestamp: new Date('2025-01-25T12:00:00Z').getTime(),
      });
      expect(
        matchesDateRange(opOnJan25, {
          from: new Date('2025-01-25'),
          to: new Date('2025-01-25'),
        }),
      ).toBe(true);
    });

    test('interprets UTC-midnight range as local calendar day (Jan 25 excludes previous day local)', () => {
      const opOnJan24 = createMockOperation({
        // Use a time that is Jan 24 in any timezone (including UTC+14)
        timestamp: new Date('2025-01-24T09:00:00Z').getTime(),
      });
      expect(
        matchesDateRange(opOnJan24, {
          from: new Date('2025-01-25'),
          to: new Date('2025-01-25'),
        }),
      ).toBe(false);
    });
  });

  describe('matchesStatus', () => {
    test('returns true when status list is empty', () => {
      const op = createMockOperation({ status: 'pending' });
      expect(matchesStatus(op, [], [])).toBe(true);
    });

    test('returns true when operation section is in status list', () => {
      const op = createMockOperation({ status: 'pending' });
      expect(matchesStatus(op, ['in_progress'], [])).toBe(true);
    });

    test('returns false when operation section is not in status list', () => {
      const op = createMockOperation({ status: 'pending' });
      expect(matchesStatus(op, ['completed'], [])).toBe(false);
    });

    test('hidden operation matches only the hidden status', () => {
      const op = createMockOperation({ id: 'op-1', status: 'pending' });
      expect(matchesStatus(op, ['hidden'], ['op-1'])).toBe(true);
      expect(matchesStatus(op, ['in_progress'], ['op-1'])).toBe(false);
    });

    test('operation never matches the drafts status', () => {
      const op = createMockOperation({ status: 'pending' });
      expect(matchesStatus(op, ['drafts'], [])).toBe(false);
    });
  });

  describe('search', () => {
    // Alice / Bob well-known accountIds — encode to real addresses for any prefix.
    const ALICE_ID = '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d' as never;
    const BOB_ID = '0x8eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a48' as never;

    // Prefix 2, deliberately not the SS58 default (0): a chain-bound account and
    // a chain-agnostic one must encode differently for the prefix assertions
    // below to mean anything.
    const chains = {
      [MOCK_CHAIN_ID]: { chainId: MOCK_CHAIN_ID, name: 'Kusama', addressPrefix: 2, assets: [] } as never as Chain,
    };

    // Charlie — a third account, so submitter/initiator assertions can't alias.
    const CHARLIE_ID = '0x90b5ab205c6974c9ea841be688864633dc9ca8a357843eeacf2314649965fe22' as never;

    const names: Record<string, string> = { [ALICE_ID]: 'Alice Multisig', [BOB_ID]: 'Adam Initiator' };
    const resolvers: Pick<SearchResolvers, 'resolveAccountName' | 'resolveAddress'> = {
      resolveAccountName: accountId => names[accountId] ?? '',
      // Real encoding — the prefix assertions below depend on it.
      resolveAddress: (accountId, chain) => toAddress(accountId, { prefix: chain?.addressPrefix }),
    };

    const search = (rows: OperationSearchRow[], query: string) => searchOperationRows(rows, query, resolvers);

    test('returns null for an empty query so no filtering is applied', () => {
      const op = createMockOperation();
      const row = buildOperationSearchRow(op, mockMultisigAccount, chains, new Map());

      expect(search([row], '')).toBeNull();
      expect(search([row], '   ')).toBeNull();
    });

    test('matches the resolved wallet name', () => {
      const op = createMockOperation();
      const row = buildOperationSearchRow(op, mockMultisigAccount, chains, new Map([[1, 'MyWallet Name']]));

      expect(search([row], 'MyWallet')).toEqual(new Set(['op-1']));
    });

    test('matches the callHash', () => {
      const op = createMockOperation({ callHash: '0xabc123def' });
      const row = buildOperationSearchRow(op, mockMultisigAccount, chains, new Map());

      expect(search([row], 'abc123')).toEqual(new Set(['op-1']));
    });

    test('matches the resolved initiator name', () => {
      const op = createMockOperation({ depositor: BOB_ID });
      const row = buildOperationSearchRow(op, mockMultisigAccount, chains, new Map());

      expect(search([row], 'Adam')).toEqual(new Set(['op-1']));
    });

    test('matches the initiator address formatted with the operation chain prefix', () => {
      const op = createMockOperation({ depositor: BOB_ID });
      const row = buildOperationSearchRow(op, mockMultisigAccount, chains, new Map());

      // Bob at the chain's prefix 2 — FoQJpP…; at the default prefix 0 he would
      // be 14E5nq…, which must not match.
      expect(search([row], 'FoQJpP')).toEqual(new Set(['op-1']));
      expect(search([row], '14E5nq')).toEqual(new Set());
    });

    test('returns an empty set when nothing matches', () => {
      const op = createMockOperation({ callHash: '0xaaa' });
      const row = buildOperationSearchRow(op, mockMultisigAccount, chains, new Map([[1, 'Wallet']]));

      expect(search([row], 'nomatch')).toEqual(new Set());
    });

    describe('flexible multisig', () => {
      // The proxied facade is what the row renders; the underlying multisig id is
      // only a link target. Searching the latter never matched what was on screen.
      const flexibleAccount = {
        accountId: ALICE_ID,
        accountType: 'flex_multisig',
        chainId: MOCK_CHAIN_ID,
        multisigAccountId: BOB_ID,
        walletId: 1,
      } as never;

      // Same accountId, but chain-agnostic — so it renders with the default prefix.
      const universalMultisigAccount = { accountId: ALICE_ID, accountType: 'multisig', walletId: 1 } as never;

      // Depositor is a third account, so a Bob match can only come from the
      // underlying multisig id — otherwise the negative assertion below is
      // satisfied by the initiator and the test can never fail on this bug.
      const flexibleOperation = createMockOperation({ multisigAccountId: BOB_ID, depositor: CHARLIE_ID });

      test('matches the proxied address the row displays', () => {
        const row = buildOperationSearchRow(flexibleOperation, flexibleAccount, chains, new Map());

        // Alice at the account's chain prefix 2 — the Submitter column's address.
        expect(search([row], 'HNZata')).toEqual(new Set(['op-1']));
      });

      test('does not match the underlying multisig address, which the row never shows', () => {
        const row = buildOperationSearchRow(flexibleOperation, flexibleAccount, chains, new Map());

        // Bob — operation.multisigAccountId, what the old search matched instead.
        expect(search([row], 'FoQJpP')).toEqual(new Set());
        expect(search([row], '14E5nq')).toEqual(new Set());
      });

      test('a chain-bound account uses its chain prefix, a universal one the default', () => {
        const op = createMockOperation({ depositor: CHARLIE_ID });

        const flexRow = buildOperationSearchRow(op, flexibleAccount, chains, new Map());
        // Alice at prefix 2, not at the default prefix 0.
        expect(search([flexRow], 'HNZata')).toEqual(new Set(['op-1']));
        expect(search([flexRow], '15oF4')).toEqual(new Set());

        const universalRow = buildOperationSearchRow(op, universalMultisigAccount, chains, new Map());
        // Same accountId, chain-agnostic — so the default prefix 0 instead.
        expect(search([universalRow], '15oF4')).toEqual(new Set(['op-1']));
        expect(search([universalRow], 'HNZata')).toEqual(new Set());
      });
    });
  });

  describe('filterOperation', () => {
    test('returns true when all filters are empty and tab is pending', () => {
      const op = createMockOperation({ status: 'pending' });
      expect(filterOperation(op, mockMultisigAccount, emptyContext)).toBe(true);
    });

    test('returns false when tab is pending but operation is hidden', () => {
      const op = createMockOperation({ id: 'op-1', status: 'pending' });
      const ctx: OperationsFilterContext = {
        ...emptyContext,
        hiddenIds: ['op-1'],
      };
      expect(filterOperation(op, mockMultisigAccount, ctx)).toBe(false);
    });

    test('returns false when tab is pending but operation status is executed', () => {
      const op = createMockOperation({ status: 'executed' });
      expect(filterOperation(op, mockMultisigAccount, emptyContext)).toBe(false);
    });

    test('returns true when all predicates pass', () => {
      const op = createMockOperation({
        id: 'op-1',
        status: 'pending',
        callHash: '0xmatch',
      });
      const ctx: OperationsFilterContext = {
        ...emptyContext,
        filters: {
          ...emptyContext.filters,
          network: [MOCK_CHAIN_ID],
          searchQuery: 'match',
        },
      };
      expect(filterOperation(op, mockMultisigAccount, ctx)).toBe(true);
    });

    test('merged scope: passes an executed op even when tab is pending', () => {
      const op = createMockOperation({ id: 'op-1', status: 'executed' });
      const ctx: OperationsFilterContext = {
        ...emptyContext,
        tab: 'pending',
        isScopeMerged: true,
      };
      expect(filterOperation(op, mockMultisigAccount, ctx)).toBe(true);
    });

    test('merged scope: still excludes a hidden op when tab is pending', () => {
      const op = createMockOperation({ id: 'op-1', status: 'pending' });
      const ctx: OperationsFilterContext = {
        ...emptyContext,
        tab: 'pending',
        hiddenIds: ['op-1'],
        isScopeMerged: true,
      };
      expect(filterOperation(op, mockMultisigAccount, ctx)).toBe(false);
    });

    test('merged scope: includes a hidden op when the status filter asks for hidden', () => {
      const hiddenOp = createMockOperation({ id: 'op-hidden', status: 'pending' });
      const visibleOp = createMockOperation({ id: 'op-visible', status: 'pending' });
      const ctx: OperationsFilterContext = {
        ...emptyContext,
        tab: 'pending',
        hiddenIds: ['op-hidden'],
        isScopeMerged: true,
        filters: { ...emptyContext.filters, status: ['hidden'] },
      };
      expect(filterOperation(hiddenOp, mockMultisigAccount, ctx)).toBe(true);
      expect(filterOperation(visibleOp, mockMultisigAccount, ctx)).toBe(false);
    });

    test('merged scope: hidden status combines with regular sections', () => {
      const hiddenOp = createMockOperation({ id: 'op-hidden', status: 'executed' });
      const completedOp = createMockOperation({ id: 'op-done', status: 'executed' });
      const pendingOp = createMockOperation({ id: 'op-pending', status: 'pending' });
      const ctx: OperationsFilterContext = {
        ...emptyContext,
        tab: 'pending',
        hiddenIds: ['op-hidden'],
        isScopeMerged: true,
        filters: { ...emptyContext.filters, status: ['completed', 'hidden'] },
      };
      expect(filterOperation(hiddenOp, mockMultisigAccount, ctx)).toBe(true);
      expect(filterOperation(completedOp, mockMultisigAccount, ctx)).toBe(true);
      expect(filterOperation(pendingOp, mockMultisigAccount, ctx)).toBe(false);
    });

    test('merged scope: drafts-only status filters out every operation', () => {
      const pendingOp = createMockOperation({ id: 'op-1', status: 'pending' });
      const executedOp = createMockOperation({ id: 'op-2', status: 'executed' });
      const ctx: OperationsFilterContext = {
        ...emptyContext,
        tab: 'pending',
        isScopeMerged: true,
        filters: { ...emptyContext.filters, status: ['drafts'] },
      };
      expect(filterOperation(pendingOp, mockMultisigAccount, ctx)).toBe(false);
      expect(filterOperation(executedOp, mockMultisigAccount, ctx)).toBe(false);
    });

    test('merged scope: hidden tab shows only hidden ops', () => {
      const hiddenOp = createMockOperation({ id: 'op-hidden', status: 'pending' });
      const visibleOp = createMockOperation({ id: 'op-visible', status: 'executed' });
      const ctx: OperationsFilterContext = {
        ...emptyContext,
        tab: 'hidden',
        hiddenIds: ['op-hidden'],
        isScopeMerged: true,
      };
      expect(filterOperation(hiddenOp, mockMultisigAccount, ctx)).toBe(true);
      expect(filterOperation(visibleOp, mockMultisigAccount, ctx)).toBe(false);
    });
  });

  describe('getWalletSearchEntries', () => {
    const multisigAccountId = '0x7f7cc72b17ac5d762869e97af14ebcc561590b6cc9eeeac7a3cdadde646c95c3' as never;

    const createMultisigWallet = (nameType?: AccountNameType) => {
      const wallet = {
        id: 1,
        name: 'multisig wallet',
        type: WalletType.MULTISIG,
        accounts: [],
      } as unknown as Wallet;

      const account = {
        id: 'ms-account',
        walletId: 1,
        type: 'universal',
        accountId: multisigAccountId,
        name: 'multisig wallet',
        nameType,
        cryptoType: CryptoType.SR25519,
        signingType: SigningType.MULTISIG,
        createdAt: 0,
      } as unknown as AnyAccount;

      return { wallet, account };
    };

    test('resolves the displayed wallet name from a backend contact', () => {
      const { wallet, account } = createMultisigWallet();
      const contact = {
        id: 'contact-1',
        name: 'FINOPS_DOT_TEAM',
        address: 'address',
        accountId: multisigAccountId,
        source: 'backend',
      } as unknown as Contact;

      const entries = getWalletSearchEntries([wallet], {
        accounts: [account],
        contacts: [contact],
        identities: {},
        chains: {},
      });

      expect(entries).toEqual([{ id: 1, name: 'FINOPS_DOT_TEAM' }]);
    });

    test('keeps the custom account name when nothing overrides it', () => {
      const { wallet, account } = createMultisigWallet(AccountNameType.CUSTOM);

      const entries = getWalletSearchEntries([wallet], {
        accounts: [account],
        contacts: [],
        identities: {},
        chains: {},
      });

      expect(entries).toEqual([{ id: 1, name: 'multisig wallet' }]);
    });
  });
});
