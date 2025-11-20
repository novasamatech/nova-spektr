import { type ApiPromise } from '@polkadot/api';
import { type SubmittableExtrinsic } from '@polkadot/api/types';
import { hexToU8a, isHex } from '@polkadot/util';

import { type MultisigTxWrapper, type ProxyTxWrapper, type Transaction, TransactionType } from '@/shared/core';
import { collectivePallet } from '@/shared/pallet/collective';
import { collectiveCorePallet } from '@/shared/pallet/collectiveCore';
import { multisigOperationService } from '@/domains/network';

import { isControllerMissing, isOldMultisigPallet } from './common/utils';

/**
 * Converts asset value to appropriate format for createType. If the value is
 * hex string, converts to Uint8Array, otherwise returns as is
 */
const prepareAssetForType = (asset: any) => {
  return isHex(asset) ? hexToU8a(asset) : asset;
};

export const getExtrinsic: Record<
  TransactionType,
  (args: Record<string, any>, api: ApiPromise) => SubmittableExtrinsic<'promise'>
> = {
  [TransactionType.TRANSFER]: ({ dest, value }, api) => {
    return api.tx.balances.transferKeepAlive
      ? api.tx.balances.transferKeepAlive(dest, value)
      : api.tx.balances.transfer(dest, value);
  },
  [TransactionType.TRANSFER_ALL]: ({ dest, keepAlive = false }, api) => {
    return api.tx.balances.transferAll(dest, keepAlive);
  },
  [TransactionType.TRANSFER_ALLOW_DEATH]: ({ dest, value }, api) => {
    return api.tx.balances.transferAllowDeath(dest, value);
  },
  [TransactionType.VESTED_TRANSFER]: ({ target, locked, startingBlock, perBlock }, api) => {
    return api.tx.vesting.vestedTransfer(target, { locked, startingBlock, perBlock });
  },
  [TransactionType.ASSET_TRANSFER]: ({ dest, value, asset, palletName = 'assets' }, api) => {
    const type = api.tx[palletName].transfer.meta.args[0].type;
    // @ts-expect-error Incorrect polkadot-js/api types
    const location = api.createType(type, prepareAssetForType(asset));

    return api.tx[palletName].transfer(location, dest, value);
  },
  [TransactionType.ORML_TRANSFER]: ({ dest, value, asset }, api) => {
    if (api.tx.currencies) {
      const type = api.tx.currencies.transfer.meta.args[1].type;
      // @ts-expect-error Incorrect polkadot-js/api types
      const location = api.createType(type, prepareAssetForType(asset));

      return api.tx.currencies.transfer(dest, location, value);
    }

    const type = api.tx.tokens.transfer.meta.args[1].type;
    // @ts-expect-error Incorrect polkadot-js/api types
    const location = api.createType(type, prepareAssetForType(asset));

    return api.tx.tokens.transfer(dest, location, value);
  },
  [TransactionType.MULTISIG_AS_MULTI]: ({ threshold, otherSignatories, maybeTimepoint, call, maxWeight }, api) => {
    return isOldMultisigPallet(api)
      ? // @ts-expect-error TODO fix
        api.tx.multisig.asMulti(threshold, otherSignatories, maybeTimepoint, call, false, maxWeight)
      : api.tx.multisig.asMulti(threshold, otherSignatories, maybeTimepoint, call, maxWeight);
  },
  [TransactionType.MULTISIG_APPROVE_AS_MULTI]: (
    { threshold, otherSignatories, maybeTimepoint, callHash, maxWeight },
    api,
  ) => api.tx.multisig.approveAsMulti(threshold, otherSignatories, maybeTimepoint, callHash, maxWeight),
  [TransactionType.MULTISIG_CANCEL_AS_MULTI]: ({ threshold, otherSignatories, maybeTimepoint, callHash }, api) =>
    api.tx.multisig.cancelAsMulti(threshold, otherSignatories, maybeTimepoint, callHash),
  [TransactionType.XCM_LIMITED_TRANSFER]: ({ spellExtrinsic }) => {
    return spellExtrinsic as SubmittableExtrinsic<'promise'>;
  },
  [TransactionType.XCM_TELEPORT]: ({ spellExtrinsic }) => {
    return spellExtrinsic as SubmittableExtrinsic<'promise'>;
  },
  [TransactionType.POLKADOT_XCM_LIMITED_TRANSFER]: ({ spellExtrinsic }) => {
    return spellExtrinsic as SubmittableExtrinsic<'promise'>;
  },
  [TransactionType.POLKADOT_XCM_TELEPORT]: ({ spellExtrinsic }) => {
    return spellExtrinsic as SubmittableExtrinsic<'promise'>;
  },
  [TransactionType.POLKADOT_XCM_TRANSFER_ASSETS]: ({ spellExtrinsic }) => {
    return spellExtrinsic as SubmittableExtrinsic<'promise'>;
  },
  [TransactionType.XTOKENS_TRANSFER_MULTIASSET]: ({ spellExtrinsic }) => {
    return spellExtrinsic as SubmittableExtrinsic<'promise'>;
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
  [TransactionType.KILL_PURE_PROXY]: ({ spawner, proxyType, index, height, extIndex }, api) => {
    return api.tx.proxy.killPure(spawner, proxyType, index, height, extIndex);
  },
  // TODO: Check that this method works correctly
  [TransactionType.PROXY]: ({ real, forceProxyType, transaction, call }, api) => {
    const tx = transaction as Transaction;
    const proxyCall = call ?? getExtrinsic[tx.type](tx.args, api).method;

    return api.tx.proxy.proxy(real, forceProxyType, proxyCall);
  },
  [TransactionType.CREATE_PURE_PROXY]: ({ proxyType, delay, index }, api) => {
    return api.tx.proxy.createPure(proxyType, delay, index);
  },
  [TransactionType.REMARK]: ({ remark }, api) => api.tx.system.remark(remark),
  [TransactionType.REMARK_WITH_EVENT]: ({ remark }, api) => api.tx.system.remarkWithEvent(remark),
  [TransactionType.UNLOCK]: ({ target, trackId }, api) => {
    return api.tx.convictionVoting.unlock(trackId, target);
  },
  [TransactionType.VOTE]: ({ referendum, vote }, api) => {
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
  [TransactionType.COLLECTIVE_VOTE]: ({ pallet, poll, aye }, api) => {
    return collectivePallet.extrinsic.vote(pallet, api, poll, aye);
  },
  [TransactionType.COLLECTIVE_SET_ACTIVE]: ({ pallet, isActive }, api) => {
    return collectiveCorePallet.extrinsic.setActive(pallet, api, isActive);
  },
  [TransactionType.COLLECTIVE_EVIDENCE_VOTE]: ({ pallet, proposal, track, poll, aye, after }, api) => {
    const transactions: SubmittableExtrinsic<'promise'>[] = [
      api.tx[`${pallet}Referenda`].submit(
        { FellowshipOrigins: { [track]: null } },
        { Inline: proposal },
        { After: after },
      ),
      api.tx[`${pallet}Referenda`].placeDecisionDeposit(poll),
      api.tx[`${pallet}Collective`].vote(poll, aye),
    ];
    return api.tx.utility.batchAll(transactions.map((call) => call.method));
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
  [TransactionType.COLLECTIVE_SUBMIT_EVIDENCE]: ({ pallet, wish, evidence }, api) => {
    return collectiveCorePallet.extrinsic.submitEvidence(pallet, api, wish, evidence);
  },
  [TransactionType.COLLECTIVE_SALARY_INDUCT]: ({ pallet }, api) => {
    return api.tx[`${pallet}Salary`].induct();
  },
  [TransactionType.COLLECTIVE_SALARY_REQUEST]: ({ pallet }, api) => {
    return api.tx[`${pallet}Salary`].register();
  },
  [TransactionType.COLLECTIVE_SALARY_PAYOUT]: ({ pallet, beneficiary }, api) => {
    return beneficiary ? api.tx[`${pallet}Salary`].payoutOther(beneficiary) : api.tx[`${pallet}Salary`].payout();
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
  const connection = txWrapper.proxiedAccount.connections.find(
    (c) => c.proxyAccountId === txWrapper.proxyAccount.accountId,
  );
  assert(connection);

  return {
    chainId: transaction.chainId,
    accountId: txWrapper.proxyAccount.accountId,
    type: TransactionType.PROXY,
    args: {
      real: txWrapper.proxiedAccount.accountId,
      forceProxyType: connection.proxyType,
      transaction,
    },
  };
};
