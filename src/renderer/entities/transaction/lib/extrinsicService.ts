import { type ApiPromise } from '@polkadot/api';
import { type SubmittableExtrinsic } from '@polkadot/api/types';
import { methods as ormlMethods } from '@substrate/txwrapper-orml';
import {
  type BaseTxInfo,
  type OptionsWithMeta,
  type UnsignedTransaction,
  defineMethod,
  methods,
} from '@substrate/txwrapper-polkadot';
import { sortBy, zipWith } from 'lodash';

import { type MultisigTxWrapper, type ProxyTxWrapper, type Transaction, TransactionType } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';

import { DEFAULT_FEE_ASSET_ITEM } from './common/constants';
import { getMaxWeight, hasDestWeight, isControllerMissing, isOldMultisigPallet } from './common/utils';
import * as xcmMethods from './common/xcmMethods';
import { convictionVotingMethods } from './wrappers/convictionVoting';

type BondWithoutContollerArgs = Omit<Parameters<typeof methods.staking.bond>[0], 'controller'>;

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

export const getUnsignedTransaction: Record<
  TransactionType,
  (transaction: Transaction, info: BaseTxInfo, options: OptionsWithMeta, api: ApiPromise) => UnsignedTransaction
> = {
  [TransactionType.TRANSFER]: (transaction, info, options, api) => {
    // @ts-expect-error TODO fix
    return api.tx.balances.transferKeepAlive
      ? methods.balances.transferKeepAlive(
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
  [TransactionType.ASSET_TRANSFER]: (transaction, info, options, api) => {
    const palletName = transaction.args.palletName ?? 'assets';
    const methodArgs = api.tx[palletName].transfer.meta.args;
    const rawArgs = [transaction.args.asset, transaction.args.dest, transaction.args.value];
    const args = zipWith(methodArgs, rawArgs, (method, arg) => {
      return [method.name.toString(), api.createType(method.type.toString(), arg)] as const;
    });

    return defineMethod(
      {
        method: {
          name: 'transfer',
          pallet: palletName,
          // @ts-expect-error defineMethod type disallow Codec type
          args: Object.fromEntries(args),
        },
        ...info,
      },
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
  [TransactionType.XCM_LIMITED_TRANSFER]: (transaction, info, options) => {
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
  [TransactionType.XCM_TELEPORT]: (transaction, info, options) => {
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
  [TransactionType.POLKADOT_XCM_LIMITED_TRANSFER]: (transaction, info, options) => {
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
  [TransactionType.POLKADOT_XCM_TELEPORT]: (transaction, info, options) => {
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
  [TransactionType.POLKADOT_XCM_TRANSFER_ASSETS]: (transaction, info, options) => {
    return xcmMethods.transferAssets(
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
  [TransactionType.XTOKENS_TRANSFER_MULTIASSET]: (transaction, info, options) => {
    return xcmMethods.transferMultiAsset(
      {
        dest: transaction.args.xcmDest,
        asset: transaction.args.xcmAsset,
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
  [TransactionType.ADD_PROXY]: (transaction, info, options) => {
    return methods.proxy.addProxy(
      {
        delegate: transaction.args.delegate,
        proxyType: transaction.args.proxyType,
        delay: transaction.args.delay,
      },
      info,
      options,
    );
  },
  [TransactionType.CREATE_PURE_PROXY]: (transaction, info, options) => {
    return methods.proxy.createPure(
      {
        proxyType: transaction.args.proxyType,
        delay: transaction.args.delay,
        index: transaction.args.index,
      },
      info,
      options,
    );
  },
  [TransactionType.REMOVE_PROXY]: (transaction, info, options) => {
    return methods.proxy.removeProxy(
      {
        delegate: transaction.args.delegate,
        proxyType: transaction.args.proxyType,
        delay: transaction.args.delay,
      },
      info,
      options,
    );
  },
  [TransactionType.REMOVE_PURE_PROXY]: (transaction, info, options) => {
    return methods.proxy.killPure(
      {
        spawner: transaction.args.spawner,
        proxyType: transaction.args.proxyType,
        index: transaction.args.index,
        height: transaction.args.height,
        extIndex: transaction.args.extIndex,
      },
      info,
      options,
    );
  },
  [TransactionType.PROXY]: (transaction, info, options, api) => {
    const tx = transaction.args.transaction as Transaction;
    const call = getUnsignedTransaction[tx.type](tx, info, options, api).method;

    return methods.proxy.proxy(
      {
        real: transaction.args.real,
        forceProxyType: transaction.args.forceProxyType,
        call,
      },
      info,
      options,
    );
  },

  [TransactionType.REMARK]: (transaction, info, options) => {
    return methods.system.remark(
      {
        remark: transaction.args.remark,
      },
      info,
      options,
    );
  },

  [TransactionType.UNLOCK]: (transaction, info, options) => {
    return convictionVotingMethods.unlock(
      {
        class: transaction.args.trackId,
        target: transaction.args.target,
      },
      info,
      options,
    );
  },

  [TransactionType.DELEGATE]: (transaction, info, options) => {
    return convictionVotingMethods.delegate(
      {
        class: transaction.args.track,
        to: transaction.args.target,
        conviction: transaction.args.conviction,
        balance: transaction.args.balance,
      },
      info,
      options,
    );
  },
  [TransactionType.EDIT_DELEGATION]: (transaction, info, options) => {
    return convictionVotingMethods.delegate(
      {
        class: transaction.args.track,
        to: transaction.args.target,
        conviction: transaction.args.conviction,
        balance: transaction.args.balance,
      },
      info,
      options,
    );
  },
  [TransactionType.VOTE]: (transaction, info, options) => {
    return convictionVotingMethods.vote(
      {
        pollIndex: transaction.args.referendum,
        vote: transaction.args.vote,
      },
      info,
      options,
    );
  },
  [TransactionType.REVOTE]: (transaction, info, options) => {
    return convictionVotingMethods.vote(
      {
        pollIndex: transaction.args.referendum,
        vote: transaction.args.vote,
      },
      info,
      options,
    );
  },
  [TransactionType.REMOVE_VOTE]: (transaction, info, options) => {
    return convictionVotingMethods.removeVote(
      {
        class: transaction.args.track,
        index: transaction.args.referendum,
      },
      info,
      options,
    );
  },

  [TransactionType.UNDELEGATE]: (transaction, info, options) => {
    return convictionVotingMethods.undelegate(
      {
        class: transaction.args.track,
      },
      info,
      options,
    );
  },

  [TransactionType.COLLECTIVE_VOTE]: (transaction, info, options) => {
    const { pallet, poll, aye } = transaction.args;

    return defineMethod(
      {
        method: {
          args: { poll, aye },
          name: 'vote',
          pallet: `${pallet}Collective`,
        },
        ...info,
      },
      options,
    );
  },
};

export const getExtrinsic: Record<
  TransactionType,
  (args: Record<string, any>, api: ApiPromise) => SubmittableExtrinsic<'promise'>
> = {
  [TransactionType.TRANSFER]: ({ dest, value }, api) =>
    api.tx.balances.transferKeepAlive
      ? api.tx.balances.transferKeepAlive(dest, value)
      : api.tx.balances.transfer(dest, value),
  [TransactionType.ASSET_TRANSFER]: ({ dest, value, asset, palletName = 'assets' }, api) => {
    const type = api.tx[palletName].transfer.meta.args[0].type;
    // @ts-expect-error Incorrect polkadot-js/api types
    const location = api.createType(type, asset);

    return api.tx[palletName].transfer(location, dest, value);
  },
  [TransactionType.ORML_TRANSFER]: ({ dest, value, asset }, api) => {
    if (api.tx.currencies) {
      const type = api.tx.currencies.transfer.meta.args[1].type;
      // @ts-expect-error Incorrect polkadot-js/api types
      const location = api.createType(type, asset);

      return api.tx.currencies.transfer(dest, location, value);
    }

    const type = api.tx.tokens.transfer.meta.args[1].type;
    // @ts-expect-error Incorrect polkadot-js/api types
    const location = api.createType(type, asset);

    return api.tx.tokens.transfer(dest, location, value);
  },
  [TransactionType.MULTISIG_AS_MULTI]: ({ threshold, otherSignatories, maybeTimepoint, callData, maxWeight }, api) => {
    return isOldMultisigPallet(api)
      ? // @ts-expect-error TODO fix
        api.tx.multisig.asMulti(threshold, otherSignatories, maybeTimepoint, callData, false, maxWeight)
      : api.tx.multisig.asMulti(threshold, otherSignatories, maybeTimepoint, callData, maxWeight);
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
    return api.tx.polkadotXcm.limitedReserveTransferAssets(xcmDest, xcmBeneficiary, xcmAsset, DEFAULT_FEE_ASSET_ITEM, {
      Unlimited: true,
    });
  },
  [TransactionType.POLKADOT_XCM_TELEPORT]: ({ xcmDest, xcmBeneficiary, xcmAsset }, api) => {
    return api.tx.polkadotXcm.limitedTeleportAssets(xcmDest, xcmBeneficiary, xcmAsset, DEFAULT_FEE_ASSET_ITEM, {
      Unlimited: true,
    });
  },
  [TransactionType.POLKADOT_XCM_TRANSFER_ASSETS]: ({ xcmDest, xcmBeneficiary, xcmAsset }, api) => {
    return api.tx.polkadotXcm.transferAssets(xcmDest, xcmBeneficiary, xcmAsset, DEFAULT_FEE_ASSET_ITEM, {
      Unlimited: true,
    });
  },
  [TransactionType.XTOKENS_TRANSFER_MULTIASSET]: ({ xcmDest, xcmAsset, xcmWeight }, api) => {
    const weight = hasDestWeight(api) ? xcmWeight : { Unlimited: true };

    return api.tx.xTokens.transferMultiasset(xcmAsset, xcmDest, weight);
  },
  // controller arg removed from bond but changes not released yet
  // https://github.com/paritytech/substrate/pull/14039
  [TransactionType.BOND]: ({ controller, value, payee }, api) =>
    isControllerMissing(api)
      ? api.tx.staking.bond(value, payee) // @ts-expect-error TODO fix
      : api.tx.staking.bond(controller, value, payee),
  [TransactionType.UNSTAKE]: ({ value }, api) => api.tx.staking.unbond(value),
  [TransactionType.STAKE_MORE]: ({ maxAdditional }, api) => api.tx.staking.bondExtra(maxAdditional),
  [TransactionType.RESTAKE]: ({ value }, api) => api.tx.staking.rebond(value),
  [TransactionType.REDEEM]: ({ numSlashingSpans }, api) => api.tx.staking.withdrawUnbonded(numSlashingSpans),
  [TransactionType.NOMINATE]: ({ targets }, api) => api.tx.staking.nominate(targets),
  [TransactionType.DESTINATION]: ({ payee }, api) => api.tx.staking.setPayee(payee),
  [TransactionType.CHILL]: (_, api) => api.tx.staking.chill(),
  [TransactionType.BATCH_ALL]: ({ transactions }, api) => {
    const calls = transactions.map((tx: Transaction) => getExtrinsic[tx.type](tx.args, api).method);

    return api.tx.utility.batchAll(calls);
  },
  [TransactionType.ADD_PROXY]: ({ delegate, proxyType, delay }, api) => {
    return api.tx.proxy.addProxy(delegate, proxyType, delay);
  },
  [TransactionType.REMOVE_PROXY]: ({ delegate, proxyType, delay }, api) => {
    return api.tx.proxy.removeProxy(delegate, proxyType, delay);
  },
  [TransactionType.REMOVE_PURE_PROXY]: ({ spawner, proxyType, index, height, extIndex }, api) => {
    return api.tx.proxy.killPure(spawner, proxyType, index, height, extIndex);
  },
  // TODO: Check that this method works correctly
  [TransactionType.PROXY]: ({ real, forceProxyType, transaction }, api) => {
    const tx = transaction as Transaction;
    const call = getExtrinsic[tx.type](tx.args, api).method;

    return api.tx.proxy.proxy(real, forceProxyType, call);
  },
  [TransactionType.CREATE_PURE_PROXY]: ({ proxyType, delay, index }, api) => {
    return api.tx.proxy.createPure(proxyType, delay, index);
  },
  [TransactionType.REMARK]: ({ remark }, api) => api.tx.system.remark(remark),
  [TransactionType.UNLOCK]: ({ target, trackId }, api) => {
    return api.tx.convictionVoting.unlock(trackId, target);
  },
  [TransactionType.VOTE]: ({ referendum, vote }, api) => {
    return api.tx.convictionVoting.vote(referendum, vote);
  },
  [TransactionType.REVOTE]: ({ referendum, vote }, api) => {
    return api.tx.convictionVoting.vote(referendum, vote);
  },
  [TransactionType.REMOVE_VOTE]: ({ track, referendum }, api) => {
    return api.tx.convictionVoting.removeVote(track, referendum);
  },
  [TransactionType.DELEGATE]: ({ track, target, conviction, balance }, api) => {
    return api.tx.convictionVoting.delegate(track, target, conviction, balance);
  },
  [TransactionType.EDIT_DELEGATION]: ({ track, target, conviction, balance }, api) => {
    return api.tx.convictionVoting.delegate(track, target, conviction, balance);
  },
  [TransactionType.UNDELEGATE]: ({ track }, api) => {
    return api.tx.convictionVoting.undelegate(track);
  },
  [TransactionType.COLLECTIVE_VOTE]: ({ pallet, pool, aye }, api) => {
    return api.tx[`${pallet}Collective`].vote(pool, aye);
  },
};

type WrapAsMultiParams<T extends Transaction = Transaction> = {
  api: ApiPromise;
  addressPrefix: number;
  transaction: T;
  txWrapper: MultisigTxWrapper;
};
export const wrapAsMulti = <T extends Transaction = Transaction>({
  api,
  addressPrefix,
  transaction,
  txWrapper,
}: WrapAsMultiParams<T>): Transaction => {
  let callData = '';
  let callHash = '';
  try {
    const extrinsic = getExtrinsic[transaction.type](transaction.args, api);
    callData = extrinsic.method.toHex();
    callHash = extrinsic.method.hash.toHex();
  } catch {
    console.log(`🟡 ${transaction.type} - not enough data to construct Extrinsic`);
  }

  const otherSignatories = sortBy(txWrapper.multisigAccount.signatories, 'accountId')
    .filter(({ accountId }) => accountId !== txWrapper.signer.accountId)
    .map(({ accountId }) => toAddress(accountId, { prefix: addressPrefix }));

  return {
    chainId: transaction.chainId,
    address: toAddress(txWrapper.signer.accountId, { prefix: addressPrefix }),
    type: TransactionType.MULTISIG_AS_MULTI,
    args: {
      threshold: txWrapper.multisigAccount.threshold,
      otherSignatories,
      maybeTimepoint: null,
      callData,
      callHash,
    },
  };
};

type WrapAsProxyParams = {
  addressPrefix: number;
  transaction: Transaction;
  txWrapper: ProxyTxWrapper;
};
export const wrapAsProxy = ({ addressPrefix, transaction, txWrapper }: WrapAsProxyParams): Transaction => {
  return {
    chainId: transaction.chainId,
    address: toAddress(txWrapper.proxyAccount.accountId, { prefix: addressPrefix }),
    type: TransactionType.PROXY,
    args: {
      real: toAddress(txWrapper.proxiedAccount.accountId, { prefix: addressPrefix }),
      forceProxyType: txWrapper.proxiedAccount.proxyType,
      transaction,
    },
  };
};
