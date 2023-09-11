import { BaseTxInfo, defineMethod, methods, OptionsWithMeta, UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { ApiPromise } from '@polkadot/api';
import { methods as ormlMethods } from '@substrate/txwrapper-orml';
import { SubmittableExtrinsic } from '@polkadot/api/types';

import { Transaction, TransactionType } from '@renderer/entities/transaction/model/transaction';
import { getMaxWeight, isControllerMissing, isOldMultisigPallet } from './common/utils';
import { IExtrinsicService } from './common/types';
import { MultisigAccount } from '@renderer/entities/account';
import { AccountId, Address } from '@renderer/domain/shared-kernel';
import { toAddress } from '@renderer/shared/lib/utils';

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

export const useExtrinsicService = (): IExtrinsicService => {
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

  const wrapAsMulti = (
    account: MultisigAccount,
    signerAccountId: AccountId,
    transaction: Transaction,
    api: ApiPromise,
    addressPrefix: number,
  ): Transaction => {
    const extrinsic = getExtrinsic[transaction.type](transaction.args, api);
    const callData = extrinsic.method.toHex();
    const callHash = extrinsic.method.hash.toHex();

    const otherSignatories = account.signatories.reduce<Address[]>((acc, s) => {
      if (s.accountId !== signerAccountId) {
        acc.push(toAddress(s.accountId, { prefix: addressPrefix }));
      }

      return acc;
    }, []);

    return {
      chainId: transaction.chainId,
      address: toAddress(signerAccountId, { prefix: addressPrefix }),
      type: TransactionType.MULTISIG_AS_MULTI,
      args: {
        threshold: account.threshold,
        otherSignatories: otherSignatories.sort(),
        maybeTimepoint: null,
        callData,
        callHash,
      },
    };
  };

  return {
    getUnsignedTransaction,
    getExtrinsic,
    wrapAsMulti,
  };
};
