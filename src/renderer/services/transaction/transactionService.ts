import { ApiPromise } from '@polkadot/api';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { hexToU8a } from '@polkadot/util';
import { methods as ormlMethods } from '@substrate/txwrapper-orml';
import {
  BaseTxInfo,
  construct,
  defineMethod,
  methods,
  OptionsWithMeta,
  TypeRegistry,
  UnsignedTransaction,
} from '@substrate/txwrapper-polkadot';
import { Call, Weight } from '@polkadot/types/interfaces';
import { Type } from '@polkadot/types';

import { Address, CallData, HexString, Threshold } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { createTxMetadata } from '@renderer/shared/utils/substrate';
import { ITransactionService, HashData, ExtrinsicResultParams } from './common/types';
import { toAccountId } from '@renderer/shared/utils/address';
import { decodeDispatchError, getMaxWeight, isOldMultisigPallet } from './common/utils';

type BalancesTransferArgs = Parameters<typeof methods.balances.transfer>[0];

// TODO change to substrate txwrapper method when it'll update
const transferAllowDeath = (
  args: BalancesTransferArgs,
  info: BaseTxInfo,
  options: OptionsWithMeta,
): UnsignedTransaction =>
  defineMethod(
    {
      method: {
        args,
        name: 'transferAllowDeath',
        pallet: 'balances',
      },
      ...info,
    },
    options,
  );

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
    (args: Transaction, info: BaseTxInfo, options: OptionsWithMeta, api: ApiPromise) => UnsignedTransaction
  > = {
    [TransactionType.TRANSFER]: (transaction, info, options, api) => {
      // @ts-ignore
      return api.tx.balances.transferAllowDeath
        ? transferAllowDeath(
            {
              dest: transaction.args.dest,
              value: transaction.args.value,
            },
            info,
            options,
          )
        : methods.balances.transfer(
            {
              dest: transaction.args.dest,
              value: transaction.args.value,
            },
            info,
            options,
          );
    },
    [TransactionType.ASSET_TRANSFER]: (transaction, info, options) => {
      return methods.assets.transfer(
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
    [TransactionType.MULTISIG_AS_MULTI]: (transaction, info, options, api) => {
      return methods.multisig.asMulti(
        {
          threshold: transaction.args.threshold,
          otherSignatories: transaction.args.otherSignatories,
          maybeTimepoint: transaction.args.maybeTimepoint,
          maxWeight: getMaxWeight(api, transaction),
          storeCall: false,
          call: transaction.args.callData,
          callHash: transaction.args.callHash,
        },
        info,
        options,
      );
    },
    [TransactionType.MULTISIG_APPROVE_AS_MULTI]: (transaction, info, options, api) => {
      return methods.multisig.approveAsMulti(
        {
          threshold: transaction.args.threshold,
          otherSignatories: transaction.args.otherSignatories,
          maybeTimepoint: transaction.args.maybeTimepoint,
          maxWeight: getMaxWeight(api, transaction),
          callHash: transaction.args.callHash,
        },
        info,
        options,
      );
    },
    [TransactionType.MULTISIG_CANCEL_AS_MULTI]: (transaction, info, options) => {
      return methods.multisig.cancelAsMulti(
        {
          timepoint: transaction.args.maybeTimepoint,
          callHash: transaction.args.callHash,
          threshold: transaction.args.threshold,
          otherSignatories: transaction.args.otherSignatories,
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
    [TransactionType.BATCH_ALL]: (transaction, info, options, api) => {
      const txMethods = transaction.args.transactions.map(
        (tx: Transaction) => getUnsignedTransaction[tx.type](tx, info, options, api).method,
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
    [TransactionType.TRANSFER]: ({ dest, value }, api) =>
      api.tx.balances.transferAllowDeath
        ? api.tx.balances.transferAllowDeath(dest, value)
        : api.tx.balances.transfer(dest, value),
    [TransactionType.ASSET_TRANSFER]: ({ dest, value, asset }, api) => api.tx.assets.transfer(asset, dest, value),
    [TransactionType.ORML_TRANSFER]: ({ dest, value, asset }, api) => api.tx.currencies.transfer(dest, asset, value),
    [TransactionType.MULTISIG_AS_MULTI]: ({ threshold, otherSignatories, maybeTimepoint, call, maxWeight }, api) => {
      return isOldMultisigPallet(api)
        ? // @ts-ignore
          api.tx.multisig.asMulti(threshold, otherSignatories, maybeTimepoint, call, false, maxWeight)
        : api.tx.multisig.asMulti(threshold, otherSignatories, maybeTimepoint, call, maxWeight);
    },
    [TransactionType.MULTISIG_APPROVE_AS_MULTI]: (
      { threshold, otherSignatories, maybeTimepoint, callHash, maxWeight },
      api,
    ) => api.tx.multisig.approveAsMulti(threshold, otherSignatories, maybeTimepoint, callHash, maxWeight),
    [TransactionType.MULTISIG_CANCEL_AS_MULTI]: ({ threshold, otherSignatories, maybeTimepoint, callHash }, api) =>
      api.tx.multisig.cancelAsMulti(threshold, otherSignatories, maybeTimepoint, callHash),
    // controller arg removed from bond but changes not released yet
    // https://github.com/paritytech/substrate/pull/14039
    // @ts-ignore
    [TransactionType.BOND]: ({ controller, value, payee }, api) => api.tx.staking.bond(controller, value, payee),
    [TransactionType.UNSTAKE]: ({ value }, api) => api.tx.staking.unbond(value),
    [TransactionType.STAKE_MORE]: ({ maxAdditional }, api) => api.tx.staking.bondExtra(maxAdditional),
    [TransactionType.RESTAKE]: ({ value }, api) => api.tx.staking.rebond(value),
    [TransactionType.REDEEM]: ({ numSlashingSpans }, api) => api.tx.staking.withdrawUnbonded(numSlashingSpans),
    [TransactionType.NOMINATE]: ({ targets }, api) => api.tx.staking.nominate(targets),
    [TransactionType.DESTINATION]: ({ payee }, api) => api.tx.staking.setPayee(payee),
    [TransactionType.CHILL]: (_, api) => api.tx.staking.chill(),
    [TransactionType.BATCH_ALL]: ({ transactions }, api) => {
      const calls = transactions.map((t: Transaction) => getExtrinsic[t.type](t.args, api).method);

      return api.tx.utility.batchAll(calls);
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

    const unsigned = getUnsignedTransaction[transaction.type](transaction, info, options, api);
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

  const getTxWeight = async (transaction: Transaction, api: ApiPromise): Promise<Weight> => {
    const extrinsic = getExtrinsic[transaction.type](transaction.args, api);
    const { weight } = await extrinsic.paymentInfo(transaction.address);

    return weight;
  };

  const getTransactionDeposit = (threshold: Threshold, api: ApiPromise): string => {
    const { depositFactor, depositBase } = api.consts.multisig;
    const deposit = depositFactor.muln(threshold).add(depositBase);

    return deposit.toString();
  };

  const submitAndWatchExtrinsic = async (
    tx: string,
    unsigned: UnsignedTransaction,
    api: ApiPromise,
    callback: (executed: boolean, params: ExtrinsicResultParams | string) => void,
  ) => {
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
  };

  // TODO: will be refactored with next tasks
  const decodeCallData = (api: ApiPromise, accountId: Address, callData: CallData): Transaction => {
    const transaction: Transaction = {
      type: TransactionType.TRANSFER,
      address: accountId,
      chainId: api.genesisHash.toHex(),
      args: {},
    };
    let extrinsicCall: Call;
    let decoded: SubmittableExtrinsic<'promise'> | null = null;

    try {
      // cater for an extrinsic input...
      decoded = api.tx(callData);
      extrinsicCall = api.createType('Call', decoded.method);
    } catch (e) {
      extrinsicCall = api.createType('Call', callData);
    }

    const { method, section } = api.registry.findMetaCall(extrinsicCall.callIndex);
    const extrinsicFn = api.tx[section][method];
    const extrinsic = extrinsicFn(...extrinsicCall.args);

    if (!decoded) {
      decoded = extrinsic;
    }

    const transferMethods = ['transfer', 'transferKeepAlive', 'transferAllowDeath'];

    if (transferMethods.includes(method) && section === 'balances') {
      transaction.type = TransactionType.TRANSFER;
      transaction.args.dest = decoded.args[0].toString();
      transaction.args.value = decoded.args[1].toString();
    }

    if (transferMethods.includes(method) && section === 'assets') {
      transaction.type = TransactionType.ASSET_TRANSFER;

      transaction.args.assetId = decoded.args[0].toString();
      transaction.args.dest = decoded.args[1].toString();
      transaction.args.value = decoded.args[2].toString();
    }

    if (method === 'transfer' && section === 'currencies') {
      transaction.type = TransactionType.ORML_TRANSFER;

      transaction.args.dest = decoded.args[0].toString();
      transaction.args.assetId = decoded.args[1].toHex();
      transaction.args.value = decoded.args[2].toString();
    }

    if (method === 'batchAll' && section === 'utility') {
      transaction.type = TransactionType.BATCH_ALL;

      const calls = api.createType('Vec<Call>', decoded.args[0].toHex());

      transaction.args.transactions = calls.map((call) => decodeCallData(api, accountId, call.toHex()));
    }

    if (method === 'bond' && section === 'staking') {
      transaction.type = TransactionType.BOND;
      transaction.args.controller = decoded.args[0].toString();
      transaction.args.value = decoded.args[1].toString();
      let payee = decoded.args[2].toString();

      try {
        payee = JSON.parse(decoded.args[2].toString());
      } catch (e) {
        console.warn(e);
      }

      transaction.args.payee = payee;
    }

    if (method === 'unbond' && section === 'staking') {
      transaction.type = TransactionType.UNSTAKE;
      transaction.args.value = decoded.args[0].toString();
    }

    if (method === 'chill' && section === 'staking') {
      transaction.type = TransactionType.CHILL;
    }

    if (method === 'rebond' && section === 'staking') {
      transaction.type = TransactionType.RESTAKE;
      transaction.args.value = decoded.args[0].toString();
    }

    if (method === 'withdrawUnbonded' && section === 'staking') {
      transaction.type = TransactionType.REDEEM;
    }

    if (method === 'nominate' && section === 'staking') {
      transaction.type = TransactionType.NOMINATE;
      transaction.args.targets = (decoded.args[0] as any).map((a: Type) => a.toString());
    }

    if (method === 'bondExtra' && section === 'staking') {
      transaction.type = TransactionType.STAKE_MORE;
      transaction.args.maxAdditional = decoded.args[0].toString();
    }

    if (method === 'setPayee' && section === 'staking') {
      transaction.type = TransactionType.DESTINATION;
      try {
        transaction.args.payee = JSON.parse(decoded.args[0].toString());
      } catch (e) {
        console.warn(e);
        transaction.args.payee = decoded.args[0].toString();
      }
    }

    return transaction;
  };

  return {
    createPayload,
    getSignedExtrinsic,
    submitAndWatchExtrinsic,
    getTransactionFee,
    getTxWeight,
    getTransactionDeposit,
    getTransactionHash,
    decodeCallData,
  };
};
