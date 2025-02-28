import { type ApiPromise } from '@polkadot/api';
import { type SubmittableExtrinsic } from '@polkadot/api/types';
import { type SignerOptions } from '@polkadot/api/types/submittable';
import { GenericSignerPayload, u32 } from '@polkadot/types';
import { type ExtrinsicEra, type Weight } from '@polkadot/types/interfaces';
import { BN, BN_ZERO, hexToU8a } from '@polkadot/util';
import { blake2AsU8a, signatureVerify } from '@polkadot/util-crypto';

import {
  type Account,
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
import { type TxMetadata, createTxMetadata, dictionary, nullable, scaleEncodedToNumber } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
// TODO transaction service should be inside network domain
// eslint-disable-next-line boundaries/element-types
import { type AnyAccount, accountService } from '@/domains/network';
import { walletUtils } from '@/entities/wallet';

import { LEAVE_SOME_SPACE_MULTIPLIER } from './common/constants';
import { type ExtrinsicResultParams } from './common/types';
import { decodeDispatchError } from './common/utils';
import { getExtrinsic, wrapAsMulti, wrapAsProxy } from './extrinsicService';

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
  const paymentInfo = await extrinsic.paymentInfo(transaction.accountId, options);

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

type SubmitResult =
  | {
      executed: true;
      params: ExtrinsicResultParams;
    }
  | {
      executed: false;
      error: string;
    };

async function signAndSubmit(
  transaction: Transaction,
  signature: HexString,
  payload: Uint8Array,
  api: ApiPromise,
): Promise<SubmitResult> {
  return new Promise<SubmitResult>((resolve) => {
    const extrinsic = getExtrinsic[transaction.type](transaction.args, api);
    const accountId = transaction.accountId;
    extrinsic.addSignature(accountId, hexToU8a(signature), payload);

    let unsubscribe: VoidFunction;

    try {
      extrinsic
        .send((result) => {
          const { status, events, txHash, txIndex, blockNumber, dispatchError, internalError } = result as any;

          const actualTxHash = txHash.toHex();
          const extrinsicIndex = txIndex;
          let isFinalApprove = false;
          let multisigError = '';

          if (internalError) {
            if (unsubscribe) {
              unsubscribe();
            }
            resolve({
              executed: false,
              error: internalError.message,
            });
            return;
          }

          if (dispatchError) {
            if (unsubscribe) {
              unsubscribe();
            }
            resolve({
              executed: false,
              error: decodeDispatchError(dispatchError, api),
            });
            return;
          }

          if (status.isInBlock) {
            for (const { event, phase } of events) {
              if (!phase.isApplyExtrinsic || !phase.asApplyExtrinsic.eq(txIndex)) continue;

              if (api.events.multisig.MultisigExecuted.is(event)) {
                isFinalApprove = true;
                multisigError = event.data[4].isErr ? decodeDispatchError(event.data[4].asErr, api) : '';
              }

              if (api.events.system.ExtrinsicSuccess.is(event)) {
                if (unsubscribe) {
                  unsubscribe();
                }
                resolve({
                  executed: true,
                  params: {
                    timepoint: {
                      index: extrinsicIndex,
                      height: blockNumber.toNumber(),
                    },
                    extrinsicHash: actualTxHash,
                    isFinalApprove,
                    multisigError,
                  },
                });
              }
            }
          }
        })
        .then((fn) => {
          unsubscribe = fn;
        })
        .catch((error) => {
          if (unsubscribe) {
            unsubscribe();
          }
          resolve({
            executed: false,
            error: (error as Error).message || 'Error',
          });
        });
    } catch (error) {
      resolve({
        executed: false,
        error: (error as Error).message || 'Error',
      });
    }
  });
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
  account: AnyAccount;
  signatories?: AnyAccount[];
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
  if (walletUtils.isMultisig(wallet)) {
    return getMultisigWrapper(params);
  }

  // TODO add flexible multisig wrapper

  if (walletUtils.isProxied(wallet)) {
    return getProxyWrapper(params);
  }

  return [];
}

function getMultisigWrapper({ wallets, account, signatories = [] }: Omit<TxWrappersParams, 'wallet'>) {
  const signersMap = dictionary((account as MultisigAccount)?.signatories || [], 'accountId', () => true);
  const signatory = signatories.at(0);

  const signers = wallets.reduce<AnyAccount[]>((acc, wallet) => {
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
    signer: signatory || ({} as AnyAccount),
  };

  if (!signatory) return [wrapper];

  const signatoryAccount = signers.find((s) => accountService.uniqId(s) === accountService.uniqId(signatory));
  if (!signatoryAccount) return [wrapper];

  const signatoryWallet = walletUtils.getWalletById(wallets, signatoryAccount.walletId);
  if (!signatoryWallet) return [wrapper];

  const nextWrappers = getTxWrappers({
    wallets,
    wallet: signatoryWallet,
    account: signatoryAccount,
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

  if (nullable(proxiesMap.at(0))) return [];

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
  const metadata = await createTxMetadata(transaction.accountId, api);

  return createPayloadWithMetadata(transaction, api, metadata);
}

function createEra(api: ApiPromise, blockNumber: HexString) {
  const mortalLength = 64;
  return api.registry.createTypeUnsafe<ExtrinsicEra>('ExtrinsicEra', [{ current: blockNumber, period: mortalLength }]);
}

function createPayloadWithMetadata(transaction: Transaction, api: ApiPromise, { signerPayloadBase }: TxMetadata) {
  // TODO we should get extrinsic from arguments, not construct it inside
  const extrinsic = getExtrinsic[transaction.type](transaction.args, api);

  if (api.registry.signedExtensions?.includes('ChargeAssetTxPayment')) {
    signerPayloadBase.assetId = undefined;
  }

  // Set era explicitly for security reason - immortal transactions can be used in replay attacks.
  const era = createEra(api, signerPayloadBase.blockNumber);

  const signingPayload = new GenericSignerPayload(api.registry, {
    ...signerPayloadBase,
    method: extrinsic.method.toHex(),
    version: extrinsic.version,
    era: era.toHex(),
    // Immortal transaction requires genesisHash instead of blockHash
    blockHash: era.toNumber() === 0 ? signerPayloadBase.genesisHash : signerPayloadBase.blockHash,
    runtimeVersion: {
      specVersion: signerPayloadBase.specVersion,
      transactionVersion: signerPayloadBase.transactionVersion,
    },
  }).toPayload();

  const signingPayloadHex = api.registry
    .createType('ExtrinsicPayload', signingPayload, { version: signingPayload.version })
    .toHex();

  return {
    type: transaction.type,
    args: transaction.args,
    unsigned: signingPayload,
    hexPayload: signingPayloadHex,
    payload: hexToU8a(signingPayloadHex),
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
  console.groupCollapsed('Transactions');
  for (const [index, log] of info.entries()) {
    console.groupCollapsed(`Operation ${index}: ${log.type}`);

    console.table({
      address: log.unsigned.address,
      chain: log.unsigned.genesisHash,
      nonce: `${log.unsigned.nonce} (${scaleEncodedToNumber(log.unsigned.nonce)})`,
    });

    console.group('args');
    console.table(log.args);
    console.groupEnd();

    console.groupCollapsed('signer payload');
    console.info(log.unsigned);
    console.groupEnd();

    console.groupCollapsed('unsigned payload');
    console.info(log.hexPayload);
    console.groupEnd();

    console.groupEnd();
  }
  console.groupEnd();
}
