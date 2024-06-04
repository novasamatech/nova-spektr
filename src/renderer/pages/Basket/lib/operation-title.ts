import { TransferTypes, XcmTypes } from '@entities/transaction';
import { BasketTransaction } from '@shared/core';

type Title = {
  title: string;
  params: Record<string, any>;
};

export const getOperationTitle = (transaction: BasketTransaction): Title => {
  if (TransferTypes.includes(transaction.coreTx.type)) {
    return { title: 'transfer.title', params: { asset: '1' } };
  }

  if (XcmTypes.includes(transaction.coreTx.type)) {
    return { title: 'transfer.xcmTitle', params: { asset: '1' } };
  }

  return { title: '', params: {} };
};
