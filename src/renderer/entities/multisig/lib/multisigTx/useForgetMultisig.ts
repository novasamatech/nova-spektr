import { type IMultisigTransactionStorage, storage } from '@shared/api/storage';

export const useForgetMultisig = (): Pick<IMultisigTransactionStorage, 'deleteMultisigTxs'> => {
  const transactionStorage = storage.connectTo('multisigTransactions');

  if (!transactionStorage) {
    throw new Error('=== 🔴 MultisigTransactions storage in not defined 🔴 ===');
  }
  const { deleteMultisigTxs } = transactionStorage;

  return {
    deleteMultisigTxs,
  };
};
