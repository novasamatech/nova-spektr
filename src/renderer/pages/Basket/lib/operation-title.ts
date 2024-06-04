import { TransferTypes, XcmTypes } from '@entities/transaction';
import { BasketTransaction, TransactionType } from '@shared/core';

type Title = {
  title: string;
  params: Record<string, any>;
};

export const getOperationTitle = (transaction: BasketTransaction): Title => {
  const type = transaction.coreTx.type;
  if (TransferTypes.includes(type)) {
    return { title: 'transfer.title', params: { asset: '1' } };
  }

  if (XcmTypes.includes(type)) {
    return { title: 'transfer.xcmTitle', params: { asset: '1' } };
  }

  const Title = {
    // Proxy
    [TransactionType.ADD_PROXY]: 'operations.modalTitles.addProxy',
    [TransactionType.REMOVE_PROXY]: 'operations.modalTitles.removeProxy',
    [TransactionType.CREATE_PURE_PROXY]: 'operations.modalTitles.a',
    [TransactionType.REMOVE_PURE_PROXY]: 'operations.modalTitles.addProxy',
    // Staking
    [TransactionType.BOND]: 'operations.modalTitles.startStakingOn',
    [TransactionType.NOMINATE]: 'operations.modalTitles.nominateOn',
    [TransactionType.STAKE_MORE]: 'operations.modalTitles.stakeMoreOn',
    [TransactionType.REDEEM]: 'operations.modalTitles.redeemOn',
    [TransactionType.RESTAKE]: 'operations.modalTitles.restakeOn',
    [TransactionType.DESTINATION]: 'operations.modalTitles.destinationOn',
    [TransactionType.UNSTAKE]: 'operations.modalTitles.unstakeOn',
  };

  // @ts-ignore
  return { title: Title[type], params: {} };
};
