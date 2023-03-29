import { ApiPromise } from '@polkadot/api';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { hexToU8a } from '@polkadot/util';
import { methods as ormlMethods } from '@substrate/txwrapper-orml';
import {
  BaseTxInfo,
  construct,
  methods,
  OptionsWithMeta,
  TypeRegistry,
  UnsignedTransaction,
} from '@substrate/txwrapper-polkadot';

import { HexString } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { createTxMetadata } from '@renderer/shared/utils/substrate';
import { ITransactionService, HashData } from './common/types';
import { toPublicKey } from '@renderer/shared/utils/address';

export const useTransaction = (): ITransactionService => {
  const createRegistry = async (api: ApiPromise) => {
    const metadataRpc = await api.rpc.state.getMetadata();

    return {
      registry: api.registry as unknown as TypeRegistry,
      metadataRpc: metadataRpc.toHex(),
    };
  };

  const getUnsignedTransaction: Record<
    TransactionType,
    (args: Transaction, info: BaseTxInfo, options: OptionsWithMeta) => UnsignedTransaction
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
    [TransactionType.UNSTAKE]: (transaction, info, options) => {
      return methods.staking.unbond(
        {
          value: transaction.args.value,
        },
        info,
        options,
      );
    },
    [TransactionType.STAKE_MORE]: (transaction, info, options) => {
      return methods.staking.bondExtra(
        {
          maxAdditional: transaction.args.maxAdditional,
        },
        info,
        options,
      );
    },
    [TransactionType.RESTAKE]: (transaction, info, options) => {
      return methods.staking.rebond(
        {
          value: transaction.args.value,
        },
        info,
        options,
      );
    },
    [TransactionType.REDEEM]: (transaction, info, options) => {
      return methods.staking.withdrawUnbonded(
        {
          numSlashingSpans: transaction.args.numSlashingSpans,
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
    [TransactionType.DESTINATION]: (transaction, info, options) => {
      return methods.staking.setPayee(
        {
          payee: transaction.args.payee,
        },
        info,
        options,
      );
    },
    [TransactionType.CHILL]: (transaction, info, options) => {
      return methods.staking.chill({}, info, options);
    },
    [TransactionType.BATCH_ALL]: (transaction, info, options) => {
      const txMethods = transaction.args.transactions.map(
        (tx: Transaction) => getUnsignedTransaction[tx.type](tx, info, options).method,
      );

      return methods.utility.batchAll(
        {
          calls: txMethods,
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
    [TransactionType.UNSTAKE]: ({ value }, api) => api.tx.staking.unbond(value),
    [TransactionType.STAKE_MORE]: ({ maxAdditional }, api) => api.tx.staking.bondExtra(maxAdditional),
    [TransactionType.RESTAKE]: ({ value }, api) => api.tx.staking.rebond(value),
    [TransactionType.REDEEM]: ({ numSlashingSpans }, api) => api.tx.staking.withdrawUnbonded(numSlashingSpans),
    [TransactionType.NOMINATE]: ({ targets }, api) => api.tx.staking.nominate(targets),
    [TransactionType.DESTINATION]: ({ targets }, api) => api.tx.staking.setPayee(targets),
    [TransactionType.CHILL]: (_, api) => api.tx.staking.chill(),
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

  const getTransactionHash = (transaction: Transaction, api: ApiPromise): HashData => {
    const extrinsic = getExtrinsic[transaction.type](transaction.args, api);

    return {
      callData: extrinsic.method.toHex(),
      callHash: extrinsic.method.hash.toHex(),
    };
  };

  const getTransactionFee = async (transaction: Transaction, api: ApiPromise): Promise<string> => {
    const extrinsic = getExtrinsic[transaction.type](transaction.args, api);
    const { partialFee } = await extrinsic.paymentInfo(transaction.address);

    return partialFee.toString();
  };

  const getTransactionDeposit = (threshold: number, api: ApiPromise): string => {
    const { depositFactor, depositBase } = api.consts.multisig;
    const deposit = depositFactor.muln(threshold).add(depositBase);

    return deposit.toString();
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
            toPublicKey(signer.toString()) !== toPublicKey(unsigned.address) ||
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
    getTransactionDeposit,
    getTransactionHash,
  };
};
