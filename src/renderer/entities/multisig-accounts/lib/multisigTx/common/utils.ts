import { type ApiPromise } from '@polkadot/api';

import { type Address, type MultisigAccount, type Transaction } from '@/shared/core';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import {
  type AnyDecodedTransaction,
  type MultisigEvent,
  type MultisigOperation,
  multisigOperationService,
} from '@/domains/network';
import { type ExtrinsicResultParams } from '@/entities/transaction';

import { type PendingMultisigTransaction } from './types';

export const getPendingMultisigTxs = async (
  api: ApiPromise,
  address: Address,
): Promise<PendingMultisigTransaction[]> => {
  const multisigs = await api.query.multisig.multisigs.entries(address);

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
  tx: AnyDecodedTransaction,
  multisigTx: Transaction,
  params: ExtrinsicResultParams,
  account: MultisigAccount,
): MultisigOperation => {
  const operationId = multisigOperationService.getOperationId(
    multisigTx.args.callHash,
    account.accountId,
    params.timepoint.height,
    params.timepoint.index,
  );
  const eventId = multisigOperationService.getEventId(operationId, multisigTx.accountId, 'approve');

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
    accountId: account.accountId,
    depositor: multisigTx.accountId,
    chainId: multisigTx.chainId,
    transaction: tx,
    callHash: multisigTx.args.callHash,
    callData: multisigTx.args.callData ?? null,
    status: 'pending',
    blockCreated: pjsSchema.helpers.toBlockHeight(params.timepoint.height),
    indexCreated: params.timepoint.index,
    timestamp: Date.now(),
    events: [event],
    section: tx.section ?? null,
    method: tx.method ?? null,
  };
};
