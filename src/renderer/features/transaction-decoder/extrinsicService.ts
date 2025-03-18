import { type ApiPromise } from '@polkadot/api';
import { type SubmittableExtrinsic } from '@polkadot/api/types';

import { type MultisigTxWrapper, type ProxyTxWrapper, type Transaction, TransactionType } from '@/shared/core';
import { multisigOperationService } from '@/domains/network';

import { DEFAULT_FEE_ASSET_ITEM } from './constants';
import { hasDestWeight, isControllerMissing } from './utils';

export const getExtrinsic: Record<
  string,
  (args: Record<string, any>, api: ApiPromise) => SubmittableExtrinsic<'promise'>
> = {
  'balances.transferKeepAlive': ({ dest, value }, api) => {
    return api.tx.balances.transferKeepAlive(dest, value);
  },
  'balances.transfer': ({ dest, value }, api) => {
    return api.tx.balances.transfer(dest, value);
  },
  'balances.transferAll': ({ dest }, api) => {
    return api.tx.balances.transferAll(dest, false);
  },
  'assets.transfer': ({ dest, value, asset, palletName = 'assets' }, api) => {
    const type = api.tx[palletName].transfer.meta.args[0].type;
    // @ts-expect-error Incorrect polkadot-js/api types
    const location = api.createType(type, asset);

    return api.tx[palletName].transfer(location, dest, value);
  },
  'currencies.transfer': ({ dest, value, asset }, api) => {
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
  'multisig.approveAsMulti': ({ threshold, otherSignatories, maybeTimepoint, callHash, maxWeight }, api) =>
    api.tx.multisig.approveAsMulti(threshold, otherSignatories, maybeTimepoint, callHash, maxWeight),
  'multisig.cancelAsMulti': ({ threshold, otherSignatories, maybeTimepoint, callHash }, api) =>
    api.tx.multisig.cancelAsMulti(threshold, otherSignatories, maybeTimepoint, callHash),
  'xcmPallet.limitedReserveTransferAssets': ({ xcmDest, xcmBeneficiary, xcmAsset }, api) => {
    return api.tx.xcmPallet.limitedReserveTransferAssets(xcmDest, xcmBeneficiary, xcmAsset, DEFAULT_FEE_ASSET_ITEM, {
      Unlimited: true,
    });
  },
  'xcmPallet.limitedTeleportAssets': ({ xcmDest, xcmBeneficiary, xcmAsset }, api) => {
    return api.tx.xcmPallet.limitedTeleportAssets(xcmDest, xcmBeneficiary, xcmAsset, DEFAULT_FEE_ASSET_ITEM, {
      Unlimited: true,
    });
  },
  'polkadotXcm.limitedReserveTransferAssets': ({ xcmDest, xcmBeneficiary, xcmAsset }, api) => {
    return api.tx.polkadotXcm.limitedReserveTransferAssets(xcmDest, xcmBeneficiary, xcmAsset, DEFAULT_FEE_ASSET_ITEM, {
      Unlimited: true,
    });
  },
  'polkadotXcm.limitedTeleportAssets': ({ xcmDest, xcmBeneficiary, xcmAsset }, api) => {
    return api.tx.polkadotXcm.limitedTeleportAssets(xcmDest, xcmBeneficiary, xcmAsset, DEFAULT_FEE_ASSET_ITEM, {
      Unlimited: true,
    });
  },
  'polkadotXcm.transferAssets': ({ xcmDest, xcmBeneficiary, xcmAsset }, api) => {
    return api.tx.polkadotXcm.transferAssets(xcmDest, xcmBeneficiary, xcmAsset, DEFAULT_FEE_ASSET_ITEM, {
      Unlimited: true,
    });
  },
  'xTokens.transferMultiasset': ({ xcmDest, xcmAsset, xcmWeight }, api) => {
    const weight = hasDestWeight(api) ? xcmWeight : { Unlimited: true };

    return api.tx.xTokens.transferMultiasset(xcmAsset, xcmDest, weight);
  },
  // controller arg removed from bond but changes not released yet
  // https://github.com/paritytech/substrate/pull/14039
  'staking.bond': ({ controller, value, payee }, api) =>
    isControllerMissing(api)
      ? api.tx.staking.bond(value, payee) // @ts-expect-error TODO fix
      : api.tx.staking.bond(controller, value, payee),
  'staking.unbond': ({ value }, api) => api.tx.staking.unbond(value),
  'staking.bondExtra': ({ maxAdditional }, api) => api.tx.staking.bondExtra(maxAdditional),
  'staking.rebond': ({ value }, api) => api.tx.staking.rebond(value),
  'staking.withdrawUnbonded': ({ numSlashingSpans }, api) => api.tx.staking.withdrawUnbonded(numSlashingSpans),
  'staking.nominate': ({ targets }, api) => api.tx.staking.nominate(targets),
  'staking.setPayee': ({ payee }, api) => api.tx.staking.setPayee(payee),
  'staking.chill': (_, api) => api.tx.staking.chill(),
  [TransactionType.BATCH_ALL]: ({ transactions }, api) => {
    const calls = transactions.map((tx: Transaction) => getExtrinsic[tx.type](tx.args, api).method);

    return api.tx.utility.batchAll(calls);
  },
  'proxy.addProxy': ({ delegate, proxyType, delay }, api) => {
    return api.tx.proxy.addProxy(delegate, proxyType, delay);
  },
  'proxy.removeProxy': ({ delegate, proxyType, delay }, api) => {
    return api.tx.proxy.removeProxy(delegate, proxyType, delay);
  },
  'proxy.killPure': ({ spawner, proxyType, index, height, extIndex }, api) => {
    return api.tx.proxy.killPure(spawner, proxyType, index, height, extIndex);
  },
  'proxy.createPure': ({ proxyType, delay, index }, api) => {
    return api.tx.proxy.createPure(proxyType, delay, index);
  },
  'system.remark': ({ remark }, api) => api.tx.system.remark(remark),
  'convictionVoting.unlock': ({ target, trackId }, api) => {
    return api.tx.convictionVoting.unlock(trackId, target);
  },
  'convictionVoting.vote': ({ referendum, vote }, api) => {
    return api.tx.convictionVoting.vote(referendum, vote);
  },
  'convictionVoting.removeVote': ({ track, referendum }, api) => {
    return api.tx.convictionVoting.removeVote(track, referendum);
  },
  'convictionVoting.delegate': ({ track, target, conviction, balance }, api) => {
    return api.tx.convictionVoting.delegate(track, target, conviction, balance);
  },
  'convictionVoting.undelegate': ({ track }, api) => {
    return api.tx.convictionVoting.undelegate(track);
  },
  'fellowshipCollective.vote': ({ poll, aye }, api) => {
    return api.tx.fellowshipCollective.vote(poll, aye);
  },
  'fellowshipCore.setActive': ({ isActive }, api) => {
    return api.tx.fellowshipCore.setActive(isActive);
  },
  /**
   * Provide evidence that a rank is deserved.
   *
   * This is free as long as no evidence for the forthcoming judgement is
   * already submitted. Evidence is cleared after an outcome (either demotion,
   * promotion of approval).
   *
   * - `origin`: A `Signed` origin of an inducted and ranked account.
   * - `wish`: The stated desire of the member.
   * - `evidence`: A dump of evidence to be considered. This should generally be
   *   either a Markdown-encoded document or a series of 32-byte hashes which
   *   can be found on a decentralised content-based-indexing system such as
   *   IPFS.
   */
  'fellowshipCore.submitEvidence': ({ wish, evidence }, api) => {
    return api.tx.fellowshipCore.submitEvidence(wish, evidence);
  },
  'fellowshipSalary.induct': (api) => {
    return api.tx.fellowshipSalary.induct();
  },
  'fellowshipSalary.register': (_, api) => {
    return api.tx.fellowshipSalary.register();
  },
  'fellowshipSalary.payout': (_, api) => {
    return api.tx.fellowshipSalary.payout();
  },
  'fellowshipSalary.payoutOther': ({ beneficiary }, api) => {
    return api.tx.fellowshipSalary.payoutOther(beneficiary);
  },
};

type WrapAsMultiParams<T extends Transaction = Transaction> = {
  api: ApiPromise;
  transaction: T;
  txWrapper: MultisigTxWrapper;
};
export const wrapAsMulti = <T extends Transaction = Transaction>({
  api,
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

  const otherSignatories = multisigOperationService.getOtherSignatories(
    txWrapper.multisigAccount,
    txWrapper.signer.accountId,
  );

  return {
    chainId: transaction.chainId,
    accountId: txWrapper.signer.accountId,
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
  transaction: Transaction;
  txWrapper: ProxyTxWrapper;
};
export const wrapAsProxy = ({ transaction, txWrapper }: WrapAsProxyParams): Transaction => {
  return {
    chainId: transaction.chainId,
    accountId: txWrapper.proxyAccount.accountId,
    type: TransactionType.PROXY,
    args: {
      real: txWrapper.proxiedAccount.accountId,
      forceProxyType: txWrapper.proxiedAccount.proxyType,
      transaction,
    },
  };
};
