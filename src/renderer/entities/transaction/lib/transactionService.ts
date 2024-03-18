import { ApiPromise } from '@polkadot/api';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { hexToU8a } from '@polkadot/util';
import { construct, TypeRegistry, UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { Weight } from '@polkadot/types/interfaces';
import { blake2AsU8a, signatureVerify } from '@polkadot/util-crypto';
import { useState } from 'react';

import { Transaction, TransactionType } from '@entities/transaction/model/transaction';
import { createTxMetadata, toAccountId } from '@shared/lib/utils';
import { getExtrinsic, getUnsignedTransaction, wrapAsMulti, wrapAsProxy } from './extrinsicService';
import type { AccountId, Address, ChainId, HexString, Threshold, Account } from '@shared/core';
import { decodeDispatchError } from './common/utils';
import { useCallDataDecoder } from './callDataDecoder';
import { accountUtils } from '../../wallet';
import {
  ITransactionService,
  HashData,
  ExtrinsicResultParams,
  TxWrappers,
  TxWrappers_OLD,
  WrapAsMulti,
} from './common/types';

const shouldWrapAsMulti = (wrapper: TxWrappers_OLD): wrapper is WrapAsMulti =>
  'signatoryId' in wrapper && 'account' in wrapper;

export const transactionService = {
  hasMultisig,
  hasProxy,

  getSignedExtrinsic,
  submitAndWatchExtrinsic,
  getWrappedTransactions,
};

async function getSignedExtrinsic(
  unsigned: UnsignedTransaction,
  signature: HexString,
  api: ApiPromise,
): Promise<string> {
  const metadataRpc = await api.rpc.state.getMetadata();

  return construct.signedTx(unsigned, signature, {
    registry: api.registry as TypeRegistry,
    metadataRpc: metadataRpc.toHex(),
  });
}

function submitAndWatchExtrinsic(
  tx: string,
  unsigned: UnsignedTransaction,
  api: ApiPromise,
  callback: (executed: boolean, params: ExtrinsicResultParams | string) => void,
) {
  let extrinsicCalls = 0;

  const callIndex = api.createType('Call', unsigned.method).callIndex;
  const { method, section } = api.registry.findMetaCall(callIndex);

  api.rpc.author
    .submitAndWatchExtrinsic(tx, async (result) => {
      if (!result.isInBlock || extrinsicCalls > 1) return;

      const signedBlock = await api.rpc.chain.getBlock();
      const blockHeight = signedBlock.block.header.number.toNumber();
      const apiAt = await api.at(signedBlock.block.header.hash);
      const allRecords = await apiAt.query.system.events();

      let actualTxHash = result.inner;
      let isFinalApprove = false;
      let multisigError = '';
      let extrinsicIndex = 0;

      // information for each contained extrinsic
      signedBlock.block.extrinsics.forEach(({ method: extrinsicMethod, signer, hash }, index) => {
        if (
          toAccountId(signer.toString()) !== toAccountId(unsigned.address) ||
          method !== extrinsicMethod.method ||
          section !== extrinsicMethod.section
        ) {
          return;
        }

        allRecords.forEach(({ phase, event }) => {
          if (!phase.isApplyExtrinsic || !phase.asApplyExtrinsic.eq(index)) return;

          if (api.events.multisig.MultisigExecuted.is(event)) {
            isFinalApprove = true;
            multisigError = event.data[4].isErr ? decodeDispatchError(event.data[4].asErr, api) : '';
          }

          if (api.events.system.ExtrinsicSuccess.is(event)) {
            extrinsicIndex = index;
            actualTxHash = hash;
            extrinsicCalls += 1;
          }

          if (api.events.system.ExtrinsicFailed.is(event)) {
            const [dispatchError] = event.data;

            const errorInfo = decodeDispatchError(dispatchError, api);

            callback(false, errorInfo);
          }
        });
      });

      if (extrinsicCalls === 1) {
        callback(true, {
          timepoint: {
            index: extrinsicIndex,
            height: blockHeight,
          },
          extrinsicHash: actualTxHash.toHex(),
          isFinalApprove,
          multisigError,
        });
      }
    })
    .catch((error) => {
      callback(false, (error as Error).message || 'Error');
    });
}

function hasMultisig(txWrappers: TxWrappers): boolean {
  return txWrappers.includes('multisig');
}

function hasProxy(txWrappers: TxWrappers): boolean {
  return txWrappers.includes('proxy');
}

type WrapperParams = {
  api: ApiPromise;
  addressPrefix: number;
  account?: Account;
  signerAccountId?: AccountId;
};
type WrappedTransactions = {
  transaction: Transaction;
  multisigTx: Transaction | null;
};
function getWrappedTransactions(
  txWrappers: TxWrappers,
  transaction: Transaction,
  { api, addressPrefix, account, signerAccountId }: WrapperParams,
): WrappedTransactions {
  const hasSignatory = account && accountUtils.isMultisigAccount(account) && signerAccountId;

  return txWrappers.reduce<WrappedTransactions>(
    (acc, wrapper) => {
      if (hasMultisig([wrapper]) && hasSignatory) {
        acc.transaction = wrapAsMulti(api, acc.transaction, account, signerAccountId, addressPrefix);
        acc.multisigTx = acc.transaction;
      }
      if (hasProxy([wrapper])) {
        acc.transaction = wrapAsProxy(api, acc.transaction, addressPrefix);
      }

      return acc;
    },
    { transaction, multisigTx: null },
  );
}

export const useTransaction = (): ITransactionService => {
  const { decodeCallData } = useCallDataDecoder();

  const [txs, setTxs] = useState<Transaction[]>([]);
  const [wrappers, setWrappers] = useState<TxWrappers_OLD[]>([]);

  const createPayload = async (
    transaction: Transaction,
    api: ApiPromise,
  ): Promise<{
    unsigned: UnsignedTransaction;
    payload: Uint8Array;
  }> => {
    const { info, options, registry } = await createTxMetadata(transaction.address, api);

    const unsigned = getUnsignedTransaction[transaction.type](transaction, info, options, api);
    if (options.signedExtensions?.includes('ChargeAssetTxPayment')) {
      unsigned.assetId = undefined;
    }
    const signingPayloadHex = construct.signingPayload(unsigned, { registry });

    return {
      unsigned,
      payload: hexToU8a(signingPayloadHex),
    };
  };

  const getTransactionHash = (transaction: Transaction, api: ApiPromise): HashData => {
    const extrinsic = getExtrinsic[transaction.type](transaction.args, api);

    return {
      callData: extrinsic.method.toHex(),
      callHash: extrinsic.method.hash.toHex(),
    };
  };

  const getTransactionFee = async (transaction: Transaction, api: ApiPromise): Promise<string> => {
    const extrinsic = getExtrinsic[transaction.type](transaction.args, api);
    const paymentInfo = await extrinsic.paymentInfo(transaction.address);

    return paymentInfo.partialFee.toString();
  };

  const getExtrinsicWeight = async (extrinsic: SubmittableExtrinsic<'promise'>): Promise<Weight> => {
    const paymentInfo = await extrinsic.paymentInfo(extrinsic.signer);

    return paymentInfo.weight;
  };

  const getTxWeight = async (transaction: Transaction, api: ApiPromise): Promise<Weight> => {
    const extrinsic = getExtrinsic[transaction.type](transaction.args, api);
    const { weight } = await extrinsic.paymentInfo(transaction.address);

    return weight;
  };

  const getMultisigDeposit = (threshold: Threshold, api: ApiPromise): string => {
    const { depositFactor, depositBase } = api.consts.multisig;
    const deposit = depositFactor.muln(threshold).add(depositBase);

    return deposit.toString();
  };

  const verifySignature = (payload: Uint8Array, signature: HexString, accountId: AccountId): Boolean => {
    const payloadToVerify = payload.length > 256 ? blake2AsU8a(payload) : payload;

    return signatureVerify(payloadToVerify, signature, accountId).isValid;
  };

  const wrapTx = (transaction: Transaction, api: ApiPromise, addressPrefix: number) => {
    wrappers.forEach((wrapper) => {
      if (shouldWrapAsMulti(wrapper)) {
        transaction = wrapAsMulti(api, transaction, wrapper.account, wrapper.signatoryId, addressPrefix);
      }
    });

    return transaction;
  };

  const buildTransaction = (
    type: TransactionType,
    address: Address,
    chainId: ChainId,
    args: Record<string, any>,
  ): Transaction => {
    return {
      type: type,
      address: address,
      chainId: chainId,
      args: args,
    };
  };

  return {
    createPayload,
    getSignedExtrinsic,
    submitAndWatchExtrinsic,
    getTransactionFee,
    getExtrinsicWeight,
    getTxWeight,
    getMultisigDeposit,
    getTransactionHash,
    decodeCallData,
    verifySignature,
    txs,
    setTxs,
    setWrappers,
    wrapTx,
    buildTransaction,
  };
};
