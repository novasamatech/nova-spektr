import { allSettled } from 'effector';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { type ChainId, type HexString } from '@/shared/core';
import { createAccountId } from '@/shared/mocks';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';
import {
  type MultisigEvent,
  type MultisigOperation,
  accounts,
  multisigOperation,
  multisigOperationService,
} from '@/domains/network';
import {
  type ExecutionResult,
  $completionEvents,
  $onChainOperationsByCallhash,
} from '@/domains/network/multisig-operation/resource';
import { walletModel } from '@/entities/wallet';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';
import { walletSelect } from '@/aggregates/wallet-select';
import { type OperationSection, getOperationSection } from '@/features/multisig-operations/lib/operations-sections';
import {
  multisigAccount,
  multisigWallet,
  polkadotChain,
  polkadotChainId,
  signatoryAccount,
  vaultWallet,
} from '../../fixtures/index';
import { type FeatureTestEnvironment, FeatureTestBuilder, allureMetadata } from '../../utils/index';

const BLOCK_CREATED = 100;
const INDEX_CREATED = 1;

// Second signatory of the multisigAccount fixture (threshold 2 of 3)
const secondSignatoryId = createAccountId(12);
// A multisig account that belongs to no local wallet
const foreignMultisigAccountId = createAccountId(99);

type CompletionEvent = {
  chainId: ChainId;
  operationId: string;
  event: MultisigEvent;
  executionResult: ExecutionResult;
};

const buildOperation = (
  multisigAccountId: AccountId,
  callHash: HexString,
  overrides: Partial<MultisigOperation> = {},
): MultisigOperation => {
  const id = multisigOperationService.getOperationId(
    polkadotChainId,
    callHash,
    multisigAccountId,
    BLOCK_CREATED,
    INDEX_CREATED,
  );

  return {
    id,
    status: 'pending',
    transaction: null,
    method: null,
    section: null,
    callHash,
    callData: null,
    chainId: polkadotChainId,
    multisigAccountId,
    depositor: signatoryAccount.accountId,
    blockCreated: pjsSchema.helpers.toBlockHeight(BLOCK_CREATED),
    indexCreated: INDEX_CREATED,
    events: [],
    timestamp: 1_700_000_000_000,
    ...overrides,
  };
};

const buildEvent = (
  operation: MultisigOperation,
  signer: AccountId,
  status: MultisigEvent['status'],
): MultisigEvent => ({
  id: multisigOperationService.getEventId(operation.id, signer, status),
  accountId: signer,
  status,
  blockCreated: pjsSchema.helpers.toBlockHeight(BLOCK_CREATED + 1),
  indexCreated: 0,
  timestamp: 1_700_000_100_000,
});

const completion = (operation: MultisigOperation, event: MultisigEvent, executionResult: ExecutionResult) => ({
  chainId: operation.chainId,
  operationId: operation.id,
  event,
  executionResult,
});

/**
 * On-chain storage snapshot for a single chain: callHash → operation, or null
 * when the entry has left chain storage (the shape the on-chain subscription
 * writes).
 */
const onChainState = (entries: [MultisigOperation, MultisigOperation | null][]) => {
  const state: Record<string, Record<string, Record<string, MultisigOperation | null>>> = {
    [polkadotChainId]: {},
  };
  for (const [operation, value] of entries) {
    state[polkadotChainId]![operation.multisigAccountId] ??= {};
    state[polkadotChainId]![operation.multisigAccountId]![operation.callHash] = value;
  }

  return state;
};

type EnvSeeds = {
  onChain?: ReturnType<typeof onChainState>;
  removedFromStorage?: MultisigOperation[];
  completionEvents?: CompletionEvent[];
};

/**
 * Builds the environment with the multisig wallet + its signatory seeded and
 * the multisig domain store in the "all chains fetched" state, so
 * `multisigOperation.$list` serves live data. The multisig wallet is then
 * selected through the real wallet-select mechanism.
 */
const createEnv = async (seeds: EnvSeeds): Promise<FeatureTestEnvironment> => {
  const builder = new FeatureTestBuilder({ autoPopulate: false })
    .withChain(polkadotChain)
    .withStoreValue(walletModel.__test.$rawWallets, [vaultWallet, multisigWallet])
    .withStoreValue(accounts.__test.$list, [signatoryAccount, multisigAccount])
    .withStoreValue(multisigOperation.__test.$expectedChainIds, [polkadotChainId])
    .withStoreValue(multisigOperation.__test.$fetchedChainIds, [polkadotChainId]);

  if (seeds.onChain) {
    builder.withStoreValue($onChainOperationsByCallhash, seeds.onChain);
  }
  if (seeds.removedFromStorage) {
    builder.withStoreValue(multisigOperation.__test.$removedFromChainStorageOperations, seeds.removedFromStorage);
  }
  if (seeds.completionEvents) {
    builder.withStoreValue($completionEvents, seeds.completionEvents);
  }

  const env = await builder.build();

  await allSettled(walletSelect.select, { scope: env.scope, params: multisigWallet.id });

  return env;
};

/**
 * Section placement over the aggregate output, mirroring how the operations
 * page groups rows (`isHidden ? 'hidden' : getOperationSection(operation)` with
 * no hidden ids in play).
 */
const getSections = (operations: MultisigOperation[]): Record<OperationSection, MultisigOperation[]> => {
  const sections: Record<OperationSection, MultisigOperation[]> = {
    in_progress: [],
    completed: [],
    rejected: [],
    hidden: [],
  };
  for (const operation of operations) {
    sections[getOperationSection(operation)].push(operation);
  }

  return sections;
};

describe('Multisig Operation Lifecycle — store derivation → selected wallet → sections', () => {
  let env: FeatureTestEnvironment;

  afterEach(async () => {
    if (env) {
      await env.cleanup();
    }
  });

  describe('Live pending operations', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Multisig Operations',
        feature: 'Operation Lifecycle',
        story: 'Pending operations from chain storage',
      });
    });

    it('should surface a pending on-chain operation in the selected wallet list and the in_progress section', async () => {
      const pendingOperation = buildOperation(multisigAccount.accountId, '0x1111');

      env = await createEnv({ onChain: onChainState([[pendingOperation, pendingOperation]]) });

      const list = env.getState(selectedWalletMultisigOperations.$list);
      expect(list).toHaveLength(1);
      expect(list[0]!.id).toBe(pendingOperation.id);
      expect(list[0]!.status).toBe('pending');

      const sections = getSections(list);
      expect(sections.in_progress.map((o) => o.id)).toEqual([pendingOperation.id]);
      expect(sections.completed).toHaveLength(0);
      expect(sections.rejected).toHaveLength(0);
    });

    it('should keep an operation with approvals below threshold in progress with approvals visible', async () => {
      const pendingOperation = buildOperation(multisigAccount.accountId, '0x2222');
      const firstApproval = buildEvent(pendingOperation, signatoryAccount.accountId, 'approve');
      const approvedOperation = { ...pendingOperation, events: [firstApproval] };

      env = await createEnv({ onChain: onChainState([[approvedOperation, approvedOperation]]) });

      const list = env.getState(selectedWalletMultisigOperations.$list);
      expect(list).toHaveLength(1);

      const [merged] = list;
      // 1 approval < threshold 2 of the multisigAccount fixture — still pending
      expect(multisigOperationService.getApprovalsCount(merged!)).toBe(1);
      expect(multisigOperationService.getApprovers(merged!).has(signatoryAccount.accountId)).toBe(true);
      expect(merged!.status).toBe('pending');

      expect(getSections(list).in_progress.map((o) => o.id)).toEqual([pendingOperation.id]);
    });
  });

  describe('Operations leaving chain storage', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Multisig Operations',
        feature: 'Operation Lifecycle',
        story: 'Terminal status derivation for removed storage entries',
      });
    });

    it('should mark an operation executed and place it in completed when MultisigExecuted (ok) was caught', async () => {
      const operation = buildOperation(multisigAccount.accountId, '0x3333', {
        events: [
          buildEvent(buildOperation(multisigAccount.accountId, '0x3333'), signatoryAccount.accountId, 'approve'),
        ],
      });
      const executorApproval = buildEvent(operation, secondSignatoryId, 'approve');

      env = await createEnv({
        onChain: onChainState([[operation, null]]),
        removedFromStorage: [operation],
        completionEvents: [completion(operation, executorApproval, 'success')],
      });

      const list = env.getState(selectedWalletMultisigOperations.$list);
      expect(list).toHaveLength(1);

      const [executed] = list;
      expect(executed!.status).toBe('executed');
      expect(executed!.awaitingOutcome).toBeUndefined();
      // Executor's signature is appended to the storage-derived approvals
      expect(executed!.events.map((e) => e.accountId).sort()).toEqual(
        [signatoryAccount.accountId, secondSignatoryId].sort(),
      );

      const sections = getSections(list);
      expect(sections.completed.map((o) => o.id)).toEqual([operation.id]);
      expect(sections.in_progress).toHaveLength(0);
    });

    it('should mark an operation cancelled and place it in rejected when a reject event was caught', async () => {
      const operation = buildOperation(multisigAccount.accountId, '0x4444');
      const rejectEvent = buildEvent(operation, signatoryAccount.accountId, 'reject');

      env = await createEnv({
        onChain: onChainState([[operation, null]]),
        removedFromStorage: [operation],
        completionEvents: [completion(operation, rejectEvent, null)],
      });

      const list = env.getState(selectedWalletMultisigOperations.$list);
      expect(list).toHaveLength(1);
      expect(list[0]!.status).toBe('cancelled');

      const sections = getSections(list);
      expect(sections.rejected.map((o) => o.id)).toEqual([operation.id]);
      expect(sections.in_progress).toHaveLength(0);
      expect(sections.completed).toHaveLength(0);
    });

    it('should keep an operation pending with awaitingOutcome when no terminal event was caught', async () => {
      const operation = buildOperation(multisigAccount.accountId, '0x5555');

      env = await createEnv({
        onChain: onChainState([[operation, null]]),
        removedFromStorage: [operation],
        completionEvents: [],
      });

      const list = env.getState(selectedWalletMultisigOperations.$list);
      expect(list).toHaveLength(1);
      expect(list[0]!.status).toBe('pending');
      expect(list[0]!.awaitingOutcome).toBe(true);

      // "Awaiting the final status": stays visible in progress until the
      // indexer reports the real outcome
      expect(getSections(list).in_progress.map((o) => o.id)).toEqual([operation.id]);
    });
  });

  describe('Wallet scoping', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Multisig Operations',
        feature: 'Operation Lifecycle',
        story: 'Selected wallet filtering',
      });
    });

    it('should exclude operations of a different multisig from the selected wallet list', async () => {
      const ownOperation = buildOperation(multisigAccount.accountId, '0x6666');
      const foreignOperation = buildOperation(foreignMultisigAccountId, '0x7777');

      env = await createEnv({
        onChain: onChainState([
          [ownOperation, ownOperation],
          [foreignOperation, foreignOperation],
        ]),
      });

      // Domain store sees both operations
      const allOperations = env.getState(multisigOperation.$list);
      expect(allOperations.map((o) => o.id).sort()).toEqual([ownOperation.id, foreignOperation.id].sort());

      // Aggregate scopes to the selected multisig wallet
      const list = env.getState(selectedWalletMultisigOperations.$list);
      expect(list.map((o) => o.id)).toEqual([ownOperation.id]);

      // Selecting a non-multisig wallet empties the list
      await allSettled(walletSelect.select, { scope: env.scope, params: vaultWallet.id });
      expect(env.getState(selectedWalletMultisigOperations.$list)).toEqual([]);
    });
  });
});
