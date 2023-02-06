import { ApiPromise } from '@polkadot/api';
import { hexToU8a } from '@polkadot/util';
import {
  construct,
  methods,
  BaseTxInfo,
  OptionsWithMeta,
  UnsignedTransaction,
  TypeRegistry,
} from '@substrate/txwrapper-polkadot';
import { methods as ormlMethods } from '@substrate/txwrapper-orml';
import { SubmittableExtrinsic } from '@polkadot/api/types';

import { createTxMetadata } from '@renderer/shared/hooks/utils/substrate';
import { ITransactionService } from './common/types';
import { HexString } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';

export const useTransaction = (): ITransactionService => {
  const createRegistry = async (api: ApiPromise) => {
    const metadataRpc = await api.rpc.state.getMetadata();

    return {
      registry: api.registry as TypeRegistry,
      metadataRpc: metadataRpc.toHex(),
    };
  };

  const getUnsignedTransaction: Record<
    TransactionType,
    (args: Record<string, any>, info: BaseTxInfo, options: OptionsWithMeta) => UnsignedTransaction
  > = {
    [TransactionType.TRANSFER]: (transaction, info, options) => {
      return methods.balances.transfer(
        {
          dest: transaction.args.dest,
          value: transaction.args.value,
        },
        info,
        options,
      );
    },
    [TransactionType.ASSET_TRANSFER]: (transaction, info, options) => {
      return methods.assets.transferKeepAlive(
        {
          id: transaction.args.asset,
          target: transaction.args.dest,
          amount: transaction.args.value,
        },
        info,
        options,
      );
    },
    [TransactionType.ORML_TRANSFER]: (transaction, info, options) => {
      return ormlMethods.currencies.transfer(
        {
          dest: transaction.args.dest,
          amount: transaction.args.value,
          currencyId: transaction.args.asset,
        },
        info,
        options,
      );
    },
    [TransactionType.BOND]: (transaction, info, options) => {
      return methods.staking.bond(
        {
          controller: transaction.args.controller,
          value: transaction.args.value,
          payee: transaction.args.payee,
        },
        info,
        options,
      );
    },
    [TransactionType.NOMINATE]: (transaction, info, options) => {
      return methods.staking.nominate(
        {
          targets: transaction.args.targets,
        },
        info,
        options,
      );
    },
    [TransactionType.BATCH_ALL]: (transaction, info, options) => {
      return methods.utility.batchAll(
        {
          calls: transaction.args.calls,
        },
        info,
        options,
      );
    },
  };

  const getExtrinsic: Record<
    TransactionType,
    (args: Record<string, any>, api: ApiPromise) => SubmittableExtrinsic<'promise'>
  > = {
    [TransactionType.TRANSFER]: ({ dest, value }, api) => api.tx.balances.transferKeepAlive(dest, value),
    [TransactionType.ASSET_TRANSFER]: ({ dest, value, asset }, api) =>
      api.tx.assets.transferKeepAlive(asset, dest, value),
    [TransactionType.ORML_TRANSFER]: ({ dest, value, asset }, api) => api.tx.currencies.transfer(dest, asset, value),
    [TransactionType.BOND]: ({ controller, value, payee }, api) => api.tx.staking.bond(controller, value, payee),
    [TransactionType.NOMINATE]: ({ targets }, api) => api.tx.staking.nominate(targets),
    [TransactionType.BATCH_ALL]: ({ transactions }, api) => {
      const calls = transactions.map((t: Transaction) => getExtrinsic[t.type](t.args, api).method);

      return api.tx.utility.batch(calls);
    },
  };

  const createPayload = async (
    transaction: Transaction,
    api: ApiPromise,
  ): Promise<{
    unsigned: UnsignedTransaction;
    payload: Uint8Array;
  }> => {
    const { info, options, registry } = await createTxMetadata(transaction.address, api);

    const unsigned = getUnsignedTransaction[transaction.type](transaction, info, options);
    const signingPayloadHex = construct.signingPayload(unsigned, { registry });

    return {
      unsigned,
      payload: hexToU8a(signingPayloadHex),
    };
  };

  const getSignedExtrinsic = async (
    unsigned: UnsignedTransaction,
    signature: HexString,
    api: ApiPromise,
  ): Promise<string> => {
    const { metadataRpc, registry } = await createRegistry(api);

    return construct.signedTx(unsigned, signature, { registry, metadataRpc });
  };

  const getTransactionFee = async (transaction: Transaction, api: ApiPromise): Promise<string> => {
    const extrinsic = getExtrinsic[transaction.type](transaction.args, api);
    const { partialFee } = await extrinsic.paymentInfo(transaction.address);

    return partialFee.toString();
  };

  const submitAndWatchExtrinsic = async (
    tx: string,
    unsigned: UnsignedTransaction,
    api: ApiPromise,
    callback: (executed: boolean, params: any) => void,
  ) => {
    let extrinsicCalls = 0;

    const callIndex = api.createType('Call', unsigned.method).callIndex;
    const { method, section } = api.registry.findMetaCall(callIndex);

    api.rpc.author
      .submitAndWatchExtrinsic(tx, async (result) => {
        if (!result.isInBlock || extrinsicCalls > 1) return;

        const signedBlock = await api.rpc.chain.getBlock();
        const apiAt = await api.at(signedBlock.block.header.hash);
        const allRecords = await apiAt.query.system.events();

        let actualTxHash = result.inner;
        let isFinalApprove = false;
        let isSuccessExtrinsic = false;

        // information for each contained extrinsic
        signedBlock.block.extrinsics.forEach(({ method: extrinsicMethod, signer, hash }, index) => {
          if (
            signer.toString() !== unsigned.address ||
            method !== extrinsicMethod.method ||
            section !== extrinsicMethod.section
          ) {
            return;
          }

          allRecords.forEach(({ phase, event }) => {
            if (!phase.isApplyExtrinsic || !phase.asApplyExtrinsic.eq(index)) return;

            if (api.events.multisig.MultisigExecuted.is(event)) {
              isFinalApprove = true;
            }

            if (api.events.system.ExtrinsicSuccess.is(event)) {
              actualTxHash = hash;
              isSuccessExtrinsic = true;
              extrinsicCalls += 1;
            }

            if (api.events.system.ExtrinsicFailed.is(event)) {
              const [dispatchError] = event.data;
              let errorInfo = dispatchError.toString();

              if (dispatchError.isModule) {
                const decoded = api.registry.findMetaError(dispatchError.asModule);

                errorInfo = decoded.name
                  .split(/(?=[A-Z])/)
                  .map((w) => w.toLowerCase())
                  .join(' ');
              }

              callback(false, errorInfo);
            }
          });
        });

        if (extrinsicCalls === 1) {
          callback(true, {
            extrinsicHash: actualTxHash.toHex(),
            isFinalApprove,
            isSuccessExtrinsic,
          });
        }
      })
      .catch((error) => {
        callback(false, (error as Error).message || 'Error');
      });
  };

  return {
    createPayload,
    getSignedExtrinsic,
    submitAndWatchExtrinsic,
    getTransactionFee,
  };
};
