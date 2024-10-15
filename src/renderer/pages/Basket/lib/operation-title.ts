import { type BasketTransaction, type Chain, TransactionType } from '@/shared/core';
import { getAssetById } from '@/shared/lib/utils';
import {
  type MultisigTransactionTypes,
  type TransferTransactionTypes,
  TransferTypes,
  type UtilityTransactionTypes,
  type XcmTransactionTypes,
  XcmTypes,
  isEditDelegationTransaction,
} from '@/entities/transaction';

import { getCoreTx } from './utils';

type Title = {
  title: string;
  params: Record<string, any>;
};

export const getOperationTitle = (transaction: BasketTransaction, chain: Chain): Title => {
  const coreTx = getCoreTx(transaction);

  const type = coreTx.type;
  const asset = getAssetById(coreTx.args.assetId, chain.assets);

  if (TransferTypes.includes(type)) {
    return { title: 'transfer.title', params: { asset: asset?.symbol } };
  }

  if (XcmTypes.includes(type)) {
    return { title: 'transfer.xcmTitle', params: { asset: asset?.symbol } };
  }

  if (isEditDelegationTransaction(coreTx)) {
    return { title: 'operations.modalTitles.editDelegationOn', params: {} };
  }

  const Title: Record<
    Exclude<
      TransactionType,
      TransferTransactionTypes | XcmTransactionTypes | MultisigTransactionTypes | UtilityTransactionTypes
    >,
    string
  > = {
    // Proxy
    [TransactionType.ADD_PROXY]: 'operations.modalTitles.addProxyOn',
    [TransactionType.REMOVE_PROXY]: 'operations.modalTitles.removeProxyOn',
    [TransactionType.CREATE_PURE_PROXY]: 'operations.modalTitles.addPureProxyOn',
    [TransactionType.REMOVE_PURE_PROXY]: 'operations.modalTitles.removePureProxyOn',
    // Staking
    [TransactionType.BOND]: 'operations.modalTitles.startStakingOn',
    [TransactionType.NOMINATE]: 'operations.modalTitles.nominateOn',
    [TransactionType.STAKE_MORE]: 'operations.modalTitles.stakeMoreOn',
    [TransactionType.REDEEM]: 'operations.modalTitles.redeemOn',
    [TransactionType.RESTAKE]: 'operations.modalTitles.restakeOn',
    [TransactionType.DESTINATION]: 'operations.modalTitles.destinationOn',
    [TransactionType.UNSTAKE]: 'operations.modalTitles.unstakeOn',
    // Governance
    [TransactionType.UNLOCK]: 'operations.modalTitles.unlockOn',
    [TransactionType.DELEGATE]: 'operations.modalTitles.delegateOn',
    [TransactionType.EDIT_DELEGATION]: 'operations.modalTitles.editDelegationOn',
    [TransactionType.UNDELEGATE]: 'operations.modalTitles.undelegateOn',
    [TransactionType.VOTE]: 'operations.modalTitles.vote',
    [TransactionType.REVOTE]: 'operations.modalTitles.revote',
    [TransactionType.REMOVE_VOTE]: 'operations.modalTitles.removeVote',
    // Remark
    [TransactionType.REMARK]: 'operations.modalTitles.remarkOn',
    // Collectives
    [TransactionType.FELLOWSHIP_VOTE]: 'operations.modalTitles.vote',
    [TransactionType.AMBASSADOR_VOTE]: 'operations.modalTitles.vote',
  };

  // @ts-expect-error TODO fix not all types used
  return { title: Title[type], params: { asset: asset?.symbol } };
};
