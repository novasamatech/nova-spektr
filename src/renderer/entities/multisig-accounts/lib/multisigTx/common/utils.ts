import { type ApiPromise } from '@polkadot/api';

import { type DecodedTransaction, type Transaction } from '@/shared/core';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';
import { type MultisigEvent, type MultisigOperation, multisigOperationService } from '@/domains/network';
import { type ExtrinsicResultParams } from '@/entities/transaction';

import { type PendingMultisigTransaction } from './types';

export const getPendingMultisigTxs = async (
  api: ApiPromise,
  accountId: AccountId,
): Promise<PendingMultisigTransaction[]> => {
  const multisigs = await api.query.multisig.multisigs.entries(accountId);

  return multisigs
    .filter(([, opt]) => opt.isSome)
    .reduce<PendingMultisigTransaction[]>((acc, [storage, opt]) => {
      if (opt.isNone) return acc;

      const params = opt.unwrap();
      const [, callHash] = storage.args;

      return [...acc, { callHash, params }];
    }, []);
};

export const buildMultisigTx = (
  tx: DecodedTransaction,
  multisigTx: Transaction,
  params: ExtrinsicResultParams,
  signatoryAccountId: AccountId,
): MultisigOperation => {
  const operationId = multisigOperationService.getOperationId(
    multisigTx.chainId,
    multisigTx.args.callHash,
    multisigTx.accountId,
    params.timepoint.height,
    params.timepoint.index,
  );
  const eventId = multisigOperationService.getEventId(operationId, signatoryAccountId, 'approve');

  const event: MultisigEvent = {
    id: eventId,
    accountId: multisigTx.accountId,
    extrinsicHash: params.extrinsicHash,
    blockCreated: pjsSchema.helpers.toBlockHeight(params.timepoint.height),
    indexCreated: params.timepoint.index,
    timestamp: Date.now(),
    status: 'approve',
  };

  return {
    id: operationId,
    status: 'pending',
    section: tx.section,
    method: tx.method,
    accountId: multisigTx.accountId,
    chainId: multisigTx.chainId,
    depositor: signatoryAccountId,
    transaction: tx,
    callHash: multisigTx.args.callHash,
    callData: multisigTx.args.callData ?? null,
    blockCreated: pjsSchema.helpers.toBlockHeight(params.timepoint.height),
    indexCreated: params.timepoint.index,
    timestamp: Date.now(),
    events: [event],
  };
};
