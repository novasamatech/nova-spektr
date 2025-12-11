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
  callHash: '0x1234',
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
        operationId: operation.id,
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
        operationId: operation.id,
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
        operationId: 'op-new',
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
      const operation1 = createTestOperation({ id: 'op-1', accountId, status: 'executed', timestamp: 1000 });
      const operation2 = createTestOperation({ id: 'op-2', accountId, status: 'pending', timestamp: 1000 });
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
        operationId: 'op-2',
        status: 'info',
      });
    });
  });
});
