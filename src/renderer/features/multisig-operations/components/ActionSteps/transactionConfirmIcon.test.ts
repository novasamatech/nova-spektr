import { type DecodedTransaction, TransactionType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { getIconName, getTransactionIconName } from './transactionConfirmIcon';

const delegate = '0x0101010101010101010101010101010101010101010101010101010101010101';
const proxiedAccountId = '0x0404040404040404040404040404040404040404040404040404040404040404' as AccountId;

const createCall = (type: TransactionType | undefined, args: Record<string, unknown> = {}, section = '', method = '') =>
  ({ type, section, method, args }) as unknown as DecodedTransaction;
const createBatch = (transactions: DecodedTransaction[]) =>
  createCall(TransactionType.BATCH_ALL, { transactions }, 'utility', 'batchAll');

const addProxy = createCall(TransactionType.ADD_PROXY, { delegate, proxyType: 'Any' }, 'proxy', 'addProxy');
const removeProxy = createCall(TransactionType.REMOVE_PROXY, { delegate, proxyType: 'Any' }, 'proxy', 'removeProxy');

describe('getTransactionIconName', () => {
  test.each([
    ['a missing call', null, 'unknownConfirm'],
    ['a call without a type', createCall(undefined), 'unknownConfirm'],
    ['a transfer', createCall(TransactionType.TRANSFER), 'transferConfirm'],
    [
      'an edit delegation batch',
      createBatch([createCall(TransactionType.UNDELEGATE), createCall(TransactionType.DELEGATE)]),
      'editDelegationConfirm',
    ],
    [
      'a known batch shape',
      createBatch([createCall(TransactionType.BOND), createCall(TransactionType.NOMINATE)]),
      'startStakingConfirm',
    ],
    [
      'an unknown batch shape',
      createBatch([createCall(TransactionType.ADD_PROXY), createCall(TransactionType.BOND)]),
      'unknownConfirm',
    ],
    ['a nested batch', createBatch([createBatch([createCall(TransactionType.UNLOCK)])]), 'unknownConfirm'],
    [
      'a proxied call',
      createCall(TransactionType.PROXY, { transaction: createCall(TransactionType.UNSTAKE) }),
      'unstakeConfirm',
    ],
  ])('should resolve the icon of %s', (_, transaction, expected) => {
    expect(getTransactionIconName(transaction)).toEqual(expected);
  });
});

describe('getIconName', () => {
  test('should use the edit flexible icon for a live edit flexible operation', () => {
    expect(getIconName({ transaction: createBatch([addProxy, removeProxy]), proxiedAccountId })).toEqual(
      'multisigCreationConfirm',
    );
  });

  test('should use the proxy change icon for a bare add + remove proxy pair on a plain multisig', () => {
    expect(getIconName({ transaction: createBatch([addProxy, removeProxy]) })).toEqual('proxyConfirm');
  });
});
