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
import { Weight } from '@polkadot/types/interfaces';
import { blake2AsU8a, signatureVerify } from '@polkadot/util-crypto';

import { AccountId, HexString, Threshold } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/entities/transaction/model/transaction';
import { createTxMetadata, toAccountId } from '@renderer/shared/lib/utils';
import { ITransactionService, HashData, ExtrinsicResultParams } from './common/types';
import {
  decodeDispatchError,
  getMaxWeight,
  hasDestWeight,
  isControllerMissing,
  isOldMultisigPallet,
} from './common/utils';
import { useCallDataDecoder } from './callDataDecoder';
import * as xcmMethods from './common/xcmMethods';
import { DEFAULT_FEE_ASSET_ITEM } from './common/constants';

type BalancesTransferArgs = Parameters<typeof methods.balances.transfer>[0];
type BondWithoutContollerArgs = Omit<Parameters<typeof methods.staking.bond>[0], 'controller'>;

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

const bondWithoutController = (
  args: BondWithoutContollerArgs,
  info: BaseTxInfo,
  options: OptionsWithMeta,
): UnsignedTransaction =>
  defineMethod(
    {
      method: {
        args,
        name: 'bond',
        pallet: 'staking',
      },
      ...info,
    },
    options,
  );

export const useTransaction = (): ITransactionService => {
  const { decodeCallData } = useCallDataDecoder();

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
    [TransactionType.ORML_TRANSFER]: (transaction, info, options, api) => {
      return api.tx.currencies
        ? ormlMethods.currencies.transfer(
            {
              dest: transaction.args.dest,
              amount: transaction.args.value,
              currencyId: transaction.args.asset,
            },
            info,
            options,
          )
        : ormlMethods.tokens.transfer(
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
    [TransactionType.XCM_LIMITED_TRANSFER]: (transaction, info, options, api) => {
      return xcmMethods.limitedReserveTransferAssets(
        'xcmPallet',
        {
          dest: transaction.args.xcmDest,
          beneficiary: transaction.args.xcmBeneficiary,
          assets: transaction.args.xcmAsset,
          feeAssetItem: DEFAULT_FEE_ASSET_ITEM,
          weightLimit: { Unlimited: true },
        },
        info,
        options,
      );
    },
    [TransactionType.XCM_TELEPORT]: (transaction, info, options, api) => {
      return xcmMethods.limitedTeleportAssets(
        'xcmPallet',
        {
          dest: transaction.args.xcmDest,
          beneficiary: transaction.args.xcmBeneficiary,
          assets: transaction.args.xcmAsset,
          feeAssetItem: DEFAULT_FEE_ASSET_ITEM,
          weightLimit: { Unlimited: true },
        },
        info,
        options,
      );
    },
    [TransactionType.POLKADOT_XCM_LIMITED_TRANSFER]: (transaction, info, options, api) => {
      return xcmMethods.limitedReserveTransferAssets(
        'polkadotXcm',
        {
          dest: transaction.args.xcmDest,
          beneficiary: transaction.args.xcmBeneficiary,
          assets: transaction.args.xcmAsset,
          feeAssetItem: DEFAULT_FEE_ASSET_ITEM,
          weightLimit: { Unlimited: true },
        },
        info,
        options,
      );
    },
    [TransactionType.POLKADOT_XCM_TELEPORT]: (transaction, info, options, api) => {
      return xcmMethods.limitedTeleportAssets(
        'polkadotXcm',
        {
          dest: transaction.args.xcmDest,
          beneficiary: transaction.args.xcmBeneficiary,
          assets: transaction.args.xcmAsset,
          feeAssetItem: DEFAULT_FEE_ASSET_ITEM,
          weightLimit: { Unlimited: true },
        },
        info,
        options,
      );
    },
    [TransactionType.XTOKENS_TRANSFER_MULTIASSET]: (transaction, info, options, api) => {
      const version = Object.keys(transaction.args.xcmAsset)[0];
      const singleXcmAsset = { [version]: transaction.args.xcmAsset[version][0] };

      return xcmMethods.transferMultiAsset(
        {
          dest: transaction.args.xcmDest,
          asset: singleXcmAsset,
          destWeightLimit: { Unlimited: true },
          destWeight: transaction.args.xcmWeight,
        },
        info,
        options,
      );
    },
    [TransactionType.BOND]: (transaction, info, options, api) => {
      return isControllerMissing(api)
        ? bondWithoutController(
            {
              value: transaction.args.value,
              payee: transaction.args.payee,
            },
            info,
            options,
          )
        : methods.staking.bond(
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
    [TransactionType.ORML_TRANSFER]: ({ dest, value, asset }, api) =>
      api.tx.currencies ? api.tx.currencies.transfer(dest, asset, value) : api.tx.tokens.transfer(dest, asset, value),
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
    [TransactionType.XCM_LIMITED_TRANSFER]: ({ xcmDest, xcmBeneficiary, xcmAsset }, api) => {
      return api.tx.xcmPallet.limitedReserveTransferAssets(xcmDest, xcmBeneficiary, xcmAsset, DEFAULT_FEE_ASSET_ITEM, {
        Unlimited: true,
      });
    },
    [TransactionType.XCM_TELEPORT]: ({ xcmDest, xcmBeneficiary, xcmAsset }, api) => {
      return api.tx.xcmPallet.limitedTeleportAssets(xcmDest, xcmBeneficiary, xcmAsset, DEFAULT_FEE_ASSET_ITEM, {
        Unlimited: true,
      });
    },
    [TransactionType.POLKADOT_XCM_LIMITED_TRANSFER]: ({ xcmDest, xcmBeneficiary, xcmAsset }, api) => {
      return api.tx.polkadotXcm.limitedReserveTransferAssets(
        xcmDest,
        xcmBeneficiary,
        xcmAsset,
        DEFAULT_FEE_ASSET_ITEM,
        { Unlimited: true },
      );
    },
    [TransactionType.POLKADOT_XCM_TELEPORT]: ({ xcmDest, xcmBeneficiary, xcmAsset }, api) => {
      return api.tx.polkadotXcm.limitedTeleportAssets(xcmDest, xcmBeneficiary, xcmAsset, DEFAULT_FEE_ASSET_ITEM, {
        Unlimited: true,
      });
    },
    [TransactionType.XTOKENS_TRANSFER_MULTIASSET]: ({ xcmDest, xcmAsset, xcmWeight }, api) => {
      const version = Object.keys(xcmAsset)[0];
      const singleXcmAsset = { [version]: xcmAsset[version][0] };
      const weight = hasDestWeight(api) ? xcmWeight : { Unlimited: true };

      return api.tx.xTokens.transferMultiasset(singleXcmAsset, xcmDest, weight);
    },
    // controller arg removed from bond but changes not released yet
    // https://github.com/paritytech/substrate/pull/14039
    // @ts-ignore
    [TransactionType.BOND]: ({ controller, value, payee }, api) =>
      isControllerMissing(api)
        ? api.tx.staking.bond(value, payee) // @ts-ignore
        : api.tx.staking.bond(controller, value, payee),
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
    if (options.signedExtensions?.includes('ChargeAssetTxPayment')) {
      unsigned.assetId = undefined;
    }
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

  const verifySignature = (payload: Uint8Array, signature: HexString, accountId: AccountId): Boolean => {
    const payloadToVerify = payload.length > 256 ? blake2AsU8a(payload) : payload;

    return signatureVerify(payloadToVerify, signature, accountId).isValid;
  };

  return {
    createPayload,
    getSignedExtrinsic,
    submitAndWatchExtrinsic,
    getTransactionFee,
    getExtrinsicWeight,
    getTxWeight,
    getTransactionDeposit,
    getTransactionHash,
    decodeCallData,
    verifySignature,
  };
};
