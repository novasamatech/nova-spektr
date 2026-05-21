import { allSettled, createEvent, fork, sample } from 'effector';
import { describe, expect, it, vi } from 'vitest';

import { storageService } from '@/shared/api/storage';
import { type Chain, type ChainId, AccountType, NotificationEvent } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type MultisigOperation, accounts, multisigOperation } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { notificationModel } from '@/entities/notification';

vi.mock('../components/Operation', () => ({
  operationTitleTransformer: () => undefined,
}));

import './notifications';

const setCachedOperations = createEvent<MultisigOperation[]>();

sample({ clock: setCachedOperations, target: multisigOperation.__test.$cachedOperations });

const chainId = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' as ChainId;
const multisigAccountId = '0xmultisig' as AccountId;

const chain = {
  chainId,
  assets: [],
} as unknown as Chain;

const multisigAccount = {
  id: 'multisig-account',
  type: 'universal',
  accountType: AccountType.MULTISIG,
  accountId: multisigAccountId,
  walletId: 1,
  name: 'Test multisig',
  createdAt: 1,
};

const operation = {
  id: 'operation-1',
  status: 'pending',
  transaction: null,
  method: null,
  section: null,
  callHash: '0x1234',
  callData: null,
  chainId,
  multisigAccountId,
  depositor: '0xdepositor' as AccountId,
  blockCreated: 100,
  indexCreated: 0,
  events: [],
  timestamp: 2,
} as unknown as MultisigOperation;

const enableAllNotifications = async (scope: ReturnType<typeof fork>) => {
  await allSettled(notificationModel.events.settingsSaved, {
    scope,
    params: {
      disabledWalletIds: [],
      notificationEvents: [
        NotificationEvent.WALLET_CREATED,
        NotificationEvent.OPERATION_CREATED,
        NotificationEvent.OPERATION_EXECUTED,
        NotificationEvent.OPERATION_REJECTED,
      ],
      soundEnabled: false,
    },
  });
};

describe('features/multisig-operations/model/notifications', () => {
  it('does not create notifications for historical operations loaded before initial sync completes', async () => {
    const createAll = vi.spyOn(storageService.notifications, 'createAll').mockResolvedValue([]);
    vi.spyOn(storageService.notifications, 'readAll').mockResolvedValue([]);

    const scope = fork({
      values: new Map<any, any>([
        [accounts.__test.$list, [multisigAccount]],
        [networkModel.$chains, { [chainId]: chain }],
        [multisigOperation.__test.$populated, true],
      ]),
    });

    await enableAllNotifications(scope);
    await allSettled(setCachedOperations, { scope, params: [] });
    await allSettled(setCachedOperations, { scope, params: [operation] });
    await allSettled(scope);

    expect(createAll).not.toHaveBeenCalled();
  });
});
