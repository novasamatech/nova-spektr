import { type ApiPromise } from '@polkadot/api';
import { type SubmittableExtrinsic } from '@polkadot/api/types';
import { type SignerOptions } from '@polkadot/api/types/submittable';
import { Compact, Enum, GenericCall, GenericMultiAddress, GenericSignerPayload } from '@polkadot/types';
import { type ExtrinsicEra, type Weight } from '@polkadot/types/interfaces';
import { type CallBase, type Codec } from '@polkadot/types/types';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import { blake2AsU8a, signatureVerify } from '@polkadot/util-crypto';
import { merkleizeMetadata } from '@polkadot-api/merkleize-metadata';

import { metadataV15Service } from '@/shared/api/network';
import {
  type Address,
  type CallData,
  type Chain,
  type HexString,
  type MultisigAccount,
  type MultisigTxWrapper,
  type ProxiedAccount,
  type ProxyTxWrapper,
  type Transaction,
  type TxWrapper,
  type Wallet,
  WrapperKind,
} from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { type TxMetadata, createTxMetadata, dictionary, nullable, upgradeNonce } from '@/shared/lib/utils';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accountService } from '@/domains/network';
import { type AnyAccount, type Extrinsic } from '@/domains/network';
import { walletUtils } from '@/entities/wallet';

import { getExtrinsic, wrapAsMulti, wrapAsProxy } from './extrinsicService';

// TODO transaction service should be inside network domain

export const transactionService = {
  isMultisig,
  isProxy,

  hasMultisig,
  hasProxy,

  getTransactionFee,
  getMultisigDeposit,
  getExtrinsicFee,

  createPayloadWithProof,
  createPayloadWithMetadata,

  getTxWrappers,
  getWrappedTransaction,

  getExtrinsicWeight,
  getTxWeight,
  verifySignature,

  createCallFromCallData,
  formatCall,

  getCallDataHex,

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
  signatory: Address | AccountId,
  options?: Partial<SignerOptions>,
) {
  const paymentInfo = await extrinsic.paymentInfo(signatory, options);

  return paymentInfo.partialFee.toBn();
}

function getMultisigDeposit(threshold: number, api: ApiPromise): string {
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
  if (walletUtils.isAnyMultisig(wallet)) {
    return getMultisigWrapper(params);
  }

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
  const proxiesMap = wallets.reduce<{ wallet: Wallet; account: AnyAccount }[]>((acc, wallet) => {
    const match = wallet.accounts.find((a) =>
      (account as ProxiedAccount).connections.some((c) => a.accountId === c.proxyAccountId),
    );

    if (match) {
      acc.push({ wallet, account: match });
    }

    return acc;
  }, []);

  if (nullable(proxiesMap.at(0))) return [];

  const wrapper: ProxyTxWrapper = {
    kind: WrapperKind.PROXY,
    proxyAccount: proxiesMap[0]!.account,
    proxiedAccount: account as ProxiedAccount,
  };

  const nextWrappers = getTxWrappers({
    wallets,
    wallet: proxiesMap[0]!.wallet,
    account: proxiesMap[0]!.account,
    signatories,
  });

  return [wrapper, ...nextWrappers];
}

type WrapperParams = {
  api: ApiPromise;
  transaction: Transaction;
  txWrappers: TxWrapper[];
};
export type WrappedTransactions = {
  wrappedTx: Transaction;
  coreTx: Transaction;
  multisigTx?: Transaction;
};

function getWrappedTransaction({ api, transaction, txWrappers }: WrapperParams): WrappedTransactions {
  return txWrappers.reduce<WrappedTransactions>(
    (acc, txWrapper) => {
      if (isMultisig(txWrapper)) {
        const multisigTx = wrapAsMulti({
          api,
          transaction: acc.wrappedTx,
          txWrapper: txWrapper,
        });

        acc.coreTx = acc.wrappedTx;
        acc.wrappedTx = multisigTx;
        acc.multisigTx = multisigTx;
      }

      if (isProxy(txWrapper)) {
        acc.wrappedTx = wrapAsProxy({
          transaction: acc.wrappedTx,
          txWrapper: txWrapper,
        });
      }

      return acc;
    },
    { wrappedTx: transaction, multisigTx: undefined, coreTx: transaction },
  );
}

async function createPayloadWithProof(
  extrinsic: Extrinsic,
  signatory: AccountId,
  api: ApiPromise,
  nonceIncrement?: number,
  blockTimeMs?: number,
  chain?: Chain,
) {
  let metadata = await createTxMetadata(signatory, api, blockTimeMs, chain);
  if (nonceIncrement) {
    metadata = upgradeNonce(metadata, nonceIncrement);
  }
  const { signerPayloadBase, mortalLength } = metadata;

  if (api.registry.signedExtensions?.includes('ChargeAssetTxPayment')) {
    signerPayloadBase.assetId = undefined;
  }

  // Set era explicitly for security reason - immortal transactions can be used in replay attacks.
  const era = createEra(api, signerPayloadBase.blockNumber, mortalLength);

  const metadataHex = await metadataV15Service.getDecodedMetadataV15(api);

  const merkleizeParams = {
    decimals: api.registry.chainDecimals[0]!,
    tokenSymbol: api.registry.chainTokens[0]!,
    base58Prefix: api.registry.chainSS58,
    specName: api.runtimeVersion.specName.toString(),
    specVersion: api.runtimeVersion.specVersion.toNumber(),
  };

  const merkleizedMetadata = merkleizeMetadata(metadataHex, merkleizeParams);

  const metadataHash = u8aToHex(merkleizedMetadata.digest());

  const signingPayload = new GenericSignerPayload(api.registry, {
    ...signerPayloadBase,
    mode: 1,
    metadataHash,
    withSignedTransaction: true,
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

  const extrinsicPayload = api.registry.createType('ExtrinsicPayload', signingPayload, {
    version: signingPayload.version,
  });
  const metadataProof = merkleizedMetadata.getProofForExtrinsicPayload(extrinsicPayload.toU8a(true));

  const payload = extrinsicPayload.toU8a(false);

  return {
    extrinsic,
    metadataProof,
    unsigned: signingPayload,
    hexPayload: extrinsicPayload.toHex(),
    payload,
    mortalLength,
    blockTimeMs: metadata.blockTimeMs,
    blockNumber: metadata.blockNumber,
  };
}

function createEra(api: ApiPromise, blockNumber: HexString, mortalLength: number) {
  return api.registry.createTypeUnsafe<ExtrinsicEra>('ExtrinsicEra', [{ current: blockNumber, period: mortalLength }]);
}

function createPayloadWithMetadata(extrinsic: Extrinsic, api: ApiPromise, metadata: TxMetadata) {
  const { signerPayloadBase, mortalLength } = metadata;
  if (api.registry.signedExtensions?.includes('ChargeAssetTxPayment')) {
    signerPayloadBase.assetId = undefined;
  }

  // Set era explicitly for security reason - immortal transactions can be used in replay attacks.
  const era = createEra(api, signerPayloadBase.blockNumber, mortalLength);

  const signingPayload = new GenericSignerPayload(api.registry, {
    ...signerPayloadBase,
    method: extrinsic.method.toHex(),
    version: api.extrinsicVersion,
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
    extrinsic,
    unsigned: signingPayload,
    hexPayload: signingPayloadHex,
    payload: hexToU8a(signingPayloadHex),
    mortalLength,
    blockTimeMs: metadata.blockTimeMs,
    blockNumber: metadata.blockNumber,
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
  try {
    return signatureVerify(payloadToVerify, signature, accountId).isValid;
  } catch {
    return false;
  }
}

function formatArg(arg: Codec, chain: Chain): unknown {
  if (Array.isArray(arg)) {
    return arg.map((a) => formatArg(a, chain));
  }

  if (arg instanceof GenericCall) {
    const args: Record<string, unknown> = {};

    for (const [key, value] of arg.argsEntries) {
      args[key] = formatArg(value, chain);
    }

    return {
      section: arg.section,
      method: arg.method,
      args,
    };
  }

  if (arg instanceof GenericMultiAddress) {
    if (arg.type === 'Id' || arg.type === 'Address20' || arg.type === 'Address32') {
      return toAddress(arg.value.toString(), { prefix: chain.addressPrefix });
    } else {
      return arg.toHuman();
    }
  }

  const isAccount = pjsSchema.accountId.safeParse(arg);
  if (isAccount.success) {
    return toAddress(isAccount.data, { prefix: chain.addressPrefix });
  }

  if (arg instanceof Compact) {
    return formatArg(arg.unwrap(), chain);
  }

  if (arg instanceof Enum) {
    return {
      [arg.type]: formatArg(arg.value, chain),
    };
  }

  if (arg instanceof Map) {
    const result: Record<string, unknown> = {};

    for (const [key, value] of arg) {
      result[key] = formatArg(value, chain);
    }

    return result;
  }

  return arg.toHuman();
}

function createCallFromCallData(callData: CallData, api: ApiPromise): CallBase<any> | null {
  try {
    return api.createType('Call', callData);
  } catch {
    return null;
  }
}

function getCallDataHex(
  transaction: Transaction | null | undefined,
  api: ApiPromise | null | undefined,
): string | null {
  if (!transaction || !api) return null;
  try {
    const extrinsic = getExtrinsic[transaction.type](transaction.args, api);

    return extrinsic.method.toHex();
  } catch {
    return null;
  }
}

function formatCall(call: CallBase<any>, chain: Chain): object {
  const args: Record<string, unknown> = {};

  // @ts-expect-error argsEntries are not defined in extrinsic type
  for (const [key, value] of call.argsEntries as [string, Codec][]) {
    args[key] = formatArg(value, chain);
  }

  return {
    section: call.section,
    method: call.method,
    args,
  };
}

function logPayload(info: Awaited<ReturnType<typeof createPayloadWithMetadata | typeof createPayloadWithProof>>[]) {
  console.groupCollapsed('Transactions');
  for (const [index, log] of info.entries()) {
    console.groupCollapsed(`Operation ${index}: ${log.extrinsic.method.section}.${log.extrinsic.method.method}`);

    console.table({
      address: log.unsigned.address,
      chain: log.unsigned.genesisHash,
      nonce: `${log.unsigned.nonce} (${parseInt(log.unsigned.nonce)})`,
    });

    console.group('args');
    // @ts-expect-error args field is not defined in json type
    console.table(log.extrinsic.method.toHuman().args);
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
