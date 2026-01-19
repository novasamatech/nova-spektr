import { allSettled, createWatch, fork } from 'effector';

import { CryptoType, NotificationType, SigningType } from '@/shared/core';
import { createAccountId, polkadotChainId } from '@/shared/mocks';
import { type BlockHeight, pjsSchema } from '@/shared/polkadotjs-schemas';
import { notificationModel } from '@/entities/notification';
import { accounts } from '../account/store';
import { type AnyAccount } from '../account/types';

import { multisigOperation } from './store';
import { type MultisigOperation } from './types';

const createTestOperation = (params: Partial<MultisigOperation> = {}): MultisigOperation => ({
  id: params.id ?? 'op-1',
  status: params.status ?? 'pending',
  transaction: null,
  method: null,
  section: null,
  callHash: params.callHash ?? '0x1234',
  callData: null,
  chainId: polkadotChainId,
  accountId: params.accountId ?? createAccountId('1'),
  depositor: createAccountId('2'),
  blockCreated: pjsSchema.helpers.toBlockHeight(100) as BlockHeight,
  indexCreated: 0,
  events: [],
  timestamp: params.timestamp ?? 1000,
});

const createTestAccount = (params: Partial<AnyAccount> = {}): AnyAccount => ({
  id: 'test-account',
  type: 'universal',
  accountId: params.accountId ?? createAccountId('1'),
  name: 'Test Account',
  walletId: 1,
  signingType: SigningType.POLKADOT_VAULT,
  cryptoType: CryptoType.SR25519,
  createdAt: params.createdAt,
});

describe('multisig operation store notifications', () => {
  describe('notification filtering by account createdAt', () => {
    it('should send notification for new operation when account has no createdAt (legacy)', async () => {
      const accountId = createAccountId('1');
      const operation = createTestOperation({ accountId, timestamp: 1000 });
      const account = createTestAccount({ accountId, createdAt: undefined });

      const notifications: unknown[] = [];
      const scope = fork({
        values: [
          [accounts.__test.$list, [account]],
          [multisigOperation.__test.$populated, true],
        ],
      });

      createWatch({
        unit: notificationModel.events.notificationsAdded,
        fn: params => notifications.push(...params),
        scope,
      });

      // First update sets the pairwise $prev store
      await allSettled(multisigOperation.__test.$list, { scope, params: [] });
      // Second update triggers pairwise with prev=[] and current=[operation]
      await allSettled(multisigOperation.__test.$list, { scope, params: [operation] });

      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: NotificationType.MULTISIG_OPERATION,
      });
    });

    it('should send notification when operation timestamp is after account createdAt', async () => {
      const accountId = createAccountId('1');
      const accountCreatedAt = 500;
      const operationTimestamp = 1000; // After account creation

      const operation = createTestOperation({ accountId, timestamp: operationTimestamp });
      const account = createTestAccount({ accountId, createdAt: accountCreatedAt });

      const notifications: unknown[] = [];
      const scope = fork({
        values: [
          [accounts.__test.$list, [account]],
          [multisigOperation.__test.$populated, true],
        ],
      });

      createWatch({
        unit: notificationModel.events.notificationsAdded,
        fn: params => notifications.push(...params),
        scope,
      });

      await allSettled(multisigOperation.__test.$list, { scope, params: [] });
      await allSettled(multisigOperation.__test.$list, { scope, params: [operation] });

      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: NotificationType.MULTISIG_OPERATION,
      });
    });

    it('should NOT send notification when operation timestamp is before account createdAt', async () => {
      const accountId = createAccountId('1');
      const accountCreatedAt = 2000;
      const operationTimestamp = 1000; // Before account creation

      const operation = createTestOperation({ accountId, timestamp: operationTimestamp });
      const account = createTestAccount({ accountId, createdAt: accountCreatedAt });

      const notifications: unknown[] = [];
      const scope = fork({
        values: [
          [accounts.__test.$list, [account]],
          [multisigOperation.__test.$populated, true],
        ],
      });

      createWatch({
        unit: notificationModel.events.notificationsAdded,
        fn: params => notifications.push(...params),
        scope,
      });

      await allSettled(multisigOperation.__test.$list, { scope, params: [] });
      await allSettled(multisigOperation.__test.$list, { scope, params: [operation] });

      expect(notifications).toHaveLength(0);
    });

    it('should send notification when operation timestamp equals account createdAt', async () => {
      const accountId = createAccountId('1');
      const timestamp = 1000;

      const operation = createTestOperation({ accountId, timestamp });
      const account = createTestAccount({ accountId, createdAt: timestamp });

      const notifications: unknown[] = [];
      const scope = fork({
        values: [
          [accounts.__test.$list, [account]],
          [multisigOperation.__test.$populated, true],
        ],
      });

      createWatch({
        unit: notificationModel.events.notificationsAdded,
        fn: params => notifications.push(...params),
        scope,
      });

      await allSettled(multisigOperation.__test.$list, { scope, params: [] });
      await allSettled(multisigOperation.__test.$list, { scope, params: [operation] });

      expect(notifications).toHaveLength(1);
    });

    it('should send notification for operation when account is not found', async () => {
      const operationAccountId = createAccountId('1');
      const differentAccountId = createAccountId('2');

      const operation = createTestOperation({ accountId: operationAccountId, timestamp: 1000 });
      const account = createTestAccount({ accountId: differentAccountId, createdAt: 500 });

      const notifications: unknown[] = [];
      const scope = fork({
        values: [
          [accounts.__test.$list, [account]],
          [multisigOperation.__test.$populated, true],
        ],
      });

      createWatch({
        unit: notificationModel.events.notificationsAdded,
        fn: params => notifications.push(...params),
        scope,
      });

      await allSettled(multisigOperation.__test.$list, { scope, params: [] });
      await allSettled(multisigOperation.__test.$list, { scope, params: [operation] });

      expect(notifications).toHaveLength(1);
    });

    it('should filter multiple operations based on their timestamps', async () => {
      const accountId = createAccountId('1');
      const accountCreatedAt = 1500;

      const oldOperation = createTestOperation({ id: 'op-old', accountId, timestamp: 1000 });
      const newOperation = createTestOperation({ id: 'op-new', accountId, timestamp: 2000 });
      const account = createTestAccount({ accountId, createdAt: accountCreatedAt });

      const notifications: unknown[] = [];
      const scope = fork({
        values: [
          [accounts.__test.$list, [account]],
          [multisigOperation.__test.$populated, true],
        ],
      });

      createWatch({
        unit: notificationModel.events.notificationsAdded,
        fn: params => notifications.push(...params),
        scope,
      });

      await allSettled(multisigOperation.__test.$list, { scope, params: [] });
      await allSettled(multisigOperation.__test.$list, { scope, params: [oldOperation, newOperation] });

      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        callHash: newOperation.callHash,
      });
    });
  });

  describe('notification triggers', () => {
    it('should NOT send notification on initial population (first update)', async () => {
      const accountId = createAccountId('1');
      const operation = createTestOperation({ accountId, timestamp: 1000 });
      const account = createTestAccount({ accountId, createdAt: 500 });

      const notifications: unknown[] = [];
      const scope = fork({
        values: [
          [accounts.__test.$list, [account]],
          // $populated starts as false and becomes true after first $list update
        ],
      });

      createWatch({
        unit: notificationModel.events.notificationsAdded,
        fn: params => notifications.push(...params),
        scope,
      });

      // First update - this sets $populated to true, but pairwise doesn't fire yet
      // (because there's no previous value to compare against)
      await allSettled(multisigOperation.__test.$list, { scope, params: [operation] });

      // No notifications should be sent on the initial population
      expect(notifications).toHaveLength(0);
    });

    it('should send notification when operation status changes from pending to executed', async () => {
      const accountId = createAccountId('1');
      const pendingOperation = createTestOperation({ accountId, status: 'pending', timestamp: 1000 });
      const executedOperation = { ...pendingOperation, status: 'executed' as const };
      const account = createTestAccount({ accountId, createdAt: 500 });

      const notifications: unknown[] = [];
      const scope = fork({
        values: [
          [accounts.__test.$list, [account]],
          [multisigOperation.__test.$populated, true],
        ],
      });

      createWatch({
        unit: notificationModel.events.notificationsAdded,
        fn: params => notifications.push(...params),
        scope,
      });

      // First update sets pending operation as previous state
      await allSettled(multisigOperation.__test.$list, { scope, params: [pendingOperation] });
      // Second update changes status to executed
      await allSettled(multisigOperation.__test.$list, { scope, params: [executedOperation] });

      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        status: 'success',
      });
    });

    it('should send notification for new pending operation', async () => {
      const accountId = createAccountId('1');
      const operation1 = createTestOperation({
        id: 'op-1',
        accountId,
        status: 'executed',
        timestamp: 1000,
        callHash: '0x1111',
      });
      const operation2 = createTestOperation({
        id: 'op-2',
        accountId,
        status: 'pending',
        timestamp: 1000,
        callHash: '0x2222',
      });
      const account = createTestAccount({ accountId, createdAt: 500 });

      const notifications: unknown[] = [];
      const scope = fork({
        values: [
          [accounts.__test.$list, [account]],
          [multisigOperation.__test.$populated, true],
        ],
      });

      createWatch({
        unit: notificationModel.events.notificationsAdded,
        fn: params => notifications.push(...params),
        scope,
      });

      // First update sets operation1 as previous state
      await allSettled(multisigOperation.__test.$list, { scope, params: [operation1] });
      // Second update adds operation2 - should trigger notification for new operation
      await allSettled(multisigOperation.__test.$list, { scope, params: [operation1, operation2] });

      // The new pending operation should trigger notification
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        callHash: operation2.callHash,
        status: 'info',
      });
    });
  });

  describe('notification deduplication', () => {
    it('should not produce duplicate notification when same operation is added with different id', async () => {
      const accountId = createAccountId('1');
      const callHash = '0xabcd1234';

      // First operation
      const operation1 = {
        ...createTestOperation({
          id: 'op-block100-index0',
          accountId,
          timestamp: 1000,
        }),
        callHash,
      };

      // Same operation but with different id (e.g., from different block/index)
      const operation2 = {
        ...createTestOperation({
          id: 'op-block200-index1',
          accountId,
          timestamp: 1000,
        }),
        callHash, // Same callHash means it's the same logical operation
      };

      const account = createTestAccount({ accountId, createdAt: 500 });

      const notifications: unknown[] = [];
      const scope = fork({
        values: [
          [accounts.__test.$list, [account]],
          [multisigOperation.__test.$populated, true],
        ],
      });

      createWatch({
        unit: notificationModel.events.notificationsAdded,
        fn: params => notifications.push(...params),
        scope,
      });

      // Initial state
      await allSettled(multisigOperation.__test.$list, { scope, params: [] });
      // Add first operation - should trigger notification
      await allSettled(multisigOperation.__test.$list, { scope, params: [operation1] });
      // Add second operation with different id but same callHash - should NOT trigger duplicate
      await allSettled(multisigOperation.__test.$list, { scope, params: [operation1, operation2] });

      // Should only have 1 notification, not 2
      expect(notifications).toHaveLength(1);
    });
  });

  describe('multi-account support', () => {
    it('should send notifications for operations from multiple accounts', async () => {
      const account1Id = createAccountId('1');
      const account2Id = createAccountId('2');

      const op1 = createTestOperation({ id: 'op-1', accountId: account1Id, timestamp: 1000 });
      const op2 = createTestOperation({ id: 'op-2', accountId: account2Id, timestamp: 1000 });

      const account1 = createTestAccount({ accountId: account1Id, createdAt: 500 });
      const account2 = createTestAccount({ accountId: account2Id, createdAt: 500 });

      const notifications: unknown[] = [];
      const scope = fork({
        values: [
          [accounts.__test.$list, [account1, account2]],
          [multisigOperation.__test.$populated, true],
        ],
      });

      createWatch({
        unit: notificationModel.events.notificationsAdded,
        fn: params => notifications.push(...params),
        scope,
      });

      await allSettled(multisigOperation.__test.$list, { scope, params: [] });
      await allSettled(multisigOperation.__test.$list, { scope, params: [op1, op2] });

      expect(notifications).toHaveLength(2);
      expect(notifications).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ multisigAccountId: account1Id }),
          expect.objectContaining({ multisigAccountId: account2Id }),
        ]),
      );
    });
  });
});
