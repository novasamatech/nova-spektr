import { type ApiPromise } from '@polkadot/api';
import { type SubmittableExtrinsic } from '@polkadot/api/types';
import { type SignerOptions } from '@polkadot/api/types/submittable';
import { u32 } from '@polkadot/types';
import { type Weight } from '@polkadot/types/interfaces';
import { BN, BN_ZERO, hexToU8a } from '@polkadot/util';
import { blake2AsU8a, signatureVerify } from '@polkadot/util-crypto';
import { construct } from '@substrate/txwrapper-polkadot';

import {
  type Account,
  type AccountId,
  type Address,
  type HexString,
  type MultisigAccount,
  type MultisigThreshold,
  type MultisigTxWrapper,
  type ProxiedAccount,
  type ProxyTxWrapper,
  type Transaction,
  type TransactionType,
  type TxWrapper,
  type Wallet,
  WrapperKind,
} from '@/shared/core';
import { type TxMetadata, createTxMetadata, dictionary, toAccountId } from '@/shared/lib/utils';
import { walletUtils } from '@/entities/wallet';

import { LEAVE_SOME_SPACE_MULTIPLIER } from './common/constants';
import { decodeDispatchError } from './common/utils';
import { getExtrinsic, getUnsignedTransaction, wrapAsMulti, wrapAsProxy } from './extrinsicService';

export const transactionService = {
  isMultisig,
  isProxy,

  hasMultisig,
  hasProxy,

  getTransactionFee,
  getMultisigDeposit,
  getExtrinsicFee,

  createPayload,
  createPayloadWithMetadata,
  createSignerOptions,
  signAndSubmit,

  getTxWrappers,
  getWrappedTransaction,

  getExtrinsicWeight,
  getTxWeight,
  verifySignature,
  splitTxsByWeight,

  logPayload,
};

async function getTransactionFee(
  transaction: Transaction,
  api: ApiPromise,
  options?: Partial<SignerOptions>,
): Promise<string> {
  const extrinsic = getExtrinsic[transaction.type](transaction.args, api);
  const paymentInfo = await extrinsic.paymentInfo(transaction.address, options);

  return paymentInfo.partialFee.toString();
}

async function getExtrinsicFee(
  extrinsic: SubmittableExtrinsic<'promise'>,
  address: Address,
  options?: Partial<SignerOptions>,
) {
  const paymentInfo = await extrinsic.paymentInfo(address, options);

  return paymentInfo.partialFee.toBn();
}

async function signAndSubmit(
  transaction: Transaction,
  signature: HexString,
  payload: Uint8Array,
  api: ApiPromise,
  callback: (executed: any, params: any) => void,
) {
  const extrinsic = getExtrinsic[transaction.type](transaction.args, api);
  const accountId = toAccountId(transaction.address);
  extrinsic.addSignature(accountId, hexToU8a(signature), payload);

  extrinsic
    .send((result) => {
      const { status, events, txHash, txIndex, blockNumber } = result as any;

      const actualTxHash = txHash.toHex();
      const extrinsicIndex = txIndex;
      let isFinalApprove = false;
      let multisigError = '';
      let extrinsicSuccess = false;

      if (status.isInBlock) {
        for (const { event, phase } of events) {
          if (!phase.isApplyExtrinsic || !phase.asApplyExtrinsic.eq(txIndex)) continue;

          if (api.events.multisig.MultisigExecuted.is(event)) {
            isFinalApprove = true;
            multisigError = event.data[4].isErr ? decodeDispatchError(event.data[4].asErr, api) : '';
          }

          if (api.events.system.ExtrinsicSuccess.is(event)) {
            extrinsicSuccess = true;
          }

          if (api.events.system.ExtrinsicFailed.is(event)) {
            const [dispatchError] = event.data;

            const errorInfo = decodeDispatchError(dispatchError, api);

            callback(false, errorInfo);
          }
        }
      }

      if (extrinsicSuccess) {
        callback(true, {
          timepoint: {
            index: extrinsicIndex,
            height: blockNumber.toNumber(),
          },
          extrinsicHash: actualTxHash,
          isFinalApprove,
          multisigError,
        });
      }
    })
    .catch((error) => callback(false, (error as Error).message || 'Error'));
}

function getMultisigDeposit(threshold: MultisigThreshold, api: ApiPromise): string {
  const { depositFactor, depositBase } = api.consts.multisig;
  const deposit = depositFactor.muln(threshold).add(depositBase);

  return deposit.toString();
}

function isMultisig(wrapper: TxWrapper): wrapper is MultisigTxWrapper {
  return wrapper.kind === WrapperKind.MULTISIG;
}

function hasMultisig(txWrappers: TxWrapper[]): boolean {
  return txWrappers.some(isMultisig);
}

function isProxy(wrapper: TxWrapper): wrapper is ProxyTxWrapper {
  return wrapper.kind === WrapperKind.PROXY;
}

function hasProxy(txWrappers: TxWrapper[]): boolean {
  return txWrappers.some(isProxy);
}

type TxWrappersParams = {
  wallets: Wallet[];
  wallet: Wallet;
  account: Account;
  signatories?: Account[];
};

/**
 * Get array of transaction wrappers (proxy/multisig) Every wrapper recursively
 * calls getTxWrappers until it finds regular account
 *
 * @param wallet Wallet that requires wrapping
 * @param params Wallets, accounts and signatories
 *
 * @returns {Array}
 */
function getTxWrappers({ wallet, ...params }: TxWrappersParams): TxWrapper[] {
  if (walletUtils.isRegularMultisig(wallet)) {
    return getMultisigWrapper(params);
  }

  if (walletUtils.isProxied(wallet)) {
    return getProxyWrapper(params);
  }

  return [];
}

function getMultisigWrapper({ wallets, account, signatories = [] }: Omit<TxWrappersParams, 'wallet'>) {
  const signersMap = dictionary((account as MultisigAccount).signatories, 'accountId', () => true);

  const signers = wallets.reduce<Account[]>((acc, wallet) => {
    const signer = wallet.accounts.find((a) => signersMap[a.accountId]);

    if (signer) {
      acc.push(signer);
    }

    return acc;
  }, []);

  const wrapper: MultisigTxWrapper = {
    kind: WrapperKind.MULTISIG,
    multisigAccount: account as MultisigAccount,
    signatories: signers,
    signer: signatories[0] || ({} as Account),
  };

  if (signatories.length === 0) return [wrapper];

  const signatoryAccount = signers.find((s) => s.id === signatories[0].id);
  if (!signatoryAccount) return [wrapper];

  const signatoryWallet = walletUtils.getWalletById(wallets, signatoryAccount.walletId);

  const nextWrappers = getTxWrappers({
    wallets,
    wallet: signatoryWallet as Wallet,
    account: signatoryAccount as Account,
    signatories: signatories.slice(1),
  });

  return [wrapper, ...nextWrappers];
}

function getProxyWrapper({ wallets, account, signatories = [] }: Omit<TxWrappersParams, 'wallet'>) {
  const proxiesMap = wallets.reduce<{ wallet: Wallet; account: Account }[]>((acc, wallet) => {
    const match = wallet.accounts.find((a) => a.accountId === (account as ProxiedAccount).proxyAccountId);

    if (match) {
      acc.push({ wallet, account: match });
    }

    return acc;
  }, []);

  const wrapper: ProxyTxWrapper = {
    kind: WrapperKind.PROXY,
    proxyAccount: proxiesMap[0].account,
    proxiedAccount: account as ProxiedAccount,
  };

  const nextWrappers = getTxWrappers({
    wallets,
    wallet: proxiesMap[0].wallet,
    account: proxiesMap[0].account,
    signatories,
  });

  return [wrapper, ...nextWrappers];
}

type WrapperParams = {
  api: ApiPromise;
  addressPrefix: number;
  transaction: Transaction;
  txWrappers: TxWrapper[];
};
export type WrappedTransactions = {
  wrappedTx: Transaction;
  coreTx: Transaction;
  multisigTx?: Transaction;
};

function getWrappedTransaction({ api, addressPrefix, transaction, txWrappers }: WrapperParams): WrappedTransactions {
  return txWrappers.reduce<WrappedTransactions>(
    (acc, txWrapper) => {
      if (isMultisig(txWrapper)) {
        const multisigTx = wrapAsMulti({
          api,
          addressPrefix,
          transaction: acc.wrappedTx,
          txWrapper: txWrapper,
        });

        acc.coreTx = acc.wrappedTx;
        acc.wrappedTx = multisigTx;
        acc.multisigTx = multisigTx;
      }

      if (isProxy(txWrapper)) {
        acc.wrappedTx = wrapAsProxy({
          addressPrefix,
          transaction: acc.wrappedTx,
          txWrapper: txWrapper,
        });
      }

      return acc;
    },
    { wrappedTx: transaction, multisigTx: undefined, coreTx: transaction },
  );
}

async function createPayload(transaction: Transaction, api: ApiPromise) {
  const metadata = await createTxMetadata(transaction.address, api);

  return createPayloadWithMetadata(transaction, api, metadata);
}

function createPayloadWithMetadata(transaction: Transaction, api: ApiPromise, { info, options, registry }: TxMetadata) {
  const unsigned = getUnsignedTransaction[transaction.type](transaction, info, options, api);
  if (options.signedExtensions?.includes('ChargeAssetTxPayment')) {
    unsigned.assetId = undefined;
  }

  const signingPayloadHex = construct.signingPayload(unsigned, { registry });

  return {
    type: transaction.type,
    args: transaction.args,
    unsigned,
    hexPayload: signingPayloadHex,
    payload: hexToU8a(signingPayloadHex),
    info,
  };
}

async function createSignerOptions(api: ApiPromise): Promise<Partial<SignerOptions>> {
  const [blockHash] = await Promise.all([api.rpc.chain.getBlockHash()]);

  return {
    blockHash,
    nonce: new u32(api.registry, 1),
    era: 64,
  };
}

async function getExtrinsicWeight(
  extrinsic: SubmittableExtrinsic<'promise'>,
  options?: Partial<SignerOptions>,
): Promise<Weight> {
  const { weight } = await extrinsic.paymentInfo(extrinsic.signer, options);

  return weight;
}

async function getTxWeight(
  transaction: Transaction,
  api: ApiPromise,
  options?: Partial<SignerOptions>,
): Promise<Weight> {
  const extrinsic = getExtrinsic[transaction.type](transaction.args, api);

  return getExtrinsicWeight(extrinsic, options);
}

function verifySignature(payload: Uint8Array, signature: HexString, accountId: AccountId): boolean {
  // For big transaction we get hash from payload
  const payloadToVerify = payload.length > 256 ? blake2AsU8a(payload) : payload;

  return signatureVerify(payloadToVerify, signature, accountId).isValid;
}

async function getBlockLimit(api: ApiPromise): Promise<BN> {
  const maxExtrinsicWeight = api.consts.system.blockWeights.perClass.normal.maxExtrinsic.value.refTime.toBn();
  const maxBlockWeight = api.consts.system.blockWeights.maxBlock.refTime.toBn();
  const blockWeight = await api.query.system.blockWeight();

  const totalWeight = blockWeight.normal.refTime
    .toBn()
    .add(blockWeight.operational.refTime.toBn())
    .add(blockWeight.mandatory.refTime.toBn());

  const freeSpaceInLastBlock = maxBlockWeight.sub(totalWeight);

  return BN.min(
    maxExtrinsicWeight.muln(LEAVE_SOME_SPACE_MULTIPLIER),
    freeSpaceInLastBlock.muln(LEAVE_SOME_SPACE_MULTIPLIER),
  );
}

async function splitTxsByWeight(api: ApiPromise, txs: Transaction[], options?: Partial<SignerOptions>) {
  const blockLimit = await getBlockLimit(api);
  const result: Transaction[][] = [[]];

  let totalRefTime = BN_ZERO;

  const txsWeights: Partial<Record<TransactionType, Weight>> = {};

  for (const tx of txs) {
    const weight = txsWeights[tx.type] || (await getTxWeight(tx, api, options));

    if (!txsWeights[tx.type]) {
      txsWeights[tx.type] = weight;
    }

    totalRefTime = totalRefTime.add(weight.refTime.toBn());

    if (totalRefTime.lt(blockLimit) && result.length > 0) {
      result[result.length - 1].push(tx);
    } else {
      result.push([tx]);

      totalRefTime = weight.refTime.toBn();
    }
  }

  return result;
}

function logPayload(info: Awaited<ReturnType<typeof createPayload>>[]) {
  console.groupCollapsed('transaction log');
  for (const log of info) {
    console.info('operation type:', log.type);

    console.table({
      address: log.info.address,
      chain: log.info.genesisHash,
      nonce: log.info.nonce,
    });

    console.group('args');
    console.table(log.args);
    console.groupEnd();

    console.groupCollapsed('unsigned');
    console.info(log.unsigned);
    console.groupEnd();

    console.groupCollapsed('signed');
    console.info(log.hexPayload);
    console.groupEnd();
  }
  console.groupEnd();
}
