import { type ApiPromise } from '@polkadot/api';
import { type Call, type DispatchError, type Weight } from '@polkadot/types/interfaces';
import { type SpRuntimeDispatchError } from '@polkadot/types/lookup';
import { type Registry } from '@polkadot/types/types';
import { BN, BN_ZERO, hexToU8a } from '@polkadot/util';

import { type HexString, type Transaction as DeprecatedTransaction } from '@/shared/core';
import { createTransformer } from '@/shared/di';
import { nonNullable, nullable, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type ExtrinsicResultParams } from '@/entities/transaction';
import { type AnyAccount } from '../account/types';

import { BlockWeight } from './helpers';
import { type AnyDecodedTransaction, type AnyTransaction, type EncodedTransaction, type Extrinsic } from './types';

const wrapTransactionTransformer = createTransformer<
  AnyTransaction,
  AnyTransaction | Promise<AnyTransaction>,
  { account: AnyAccount; route: AnyAccount[]; api: ApiPromise }
>();

const wrapLegacyTransactionTransformer = createTransformer<
  DeprecatedTransaction,
  DeprecatedTransaction | Promise<DeprecatedTransaction>,
  { account: AnyAccount; route: AnyAccount[]; api: ApiPromise }
>();

const unwrapTransactionTransformer = createTransformer<
  // currect transaction
  AnyDecodedTransaction,
  // child transaction
  AnyTransaction,
  { api: ApiPromise }
>();
const encodeTransactionTransformer = createTransformer<AnyDecodedTransaction, HexString, { api: ApiPromise }>();
const decodeTransactionTransformer = createTransformer<Extrinsic, AnyDecodedTransaction>();

function isEncodedTransaction(transaction: AnyTransaction): transaction is EncodedTransaction {
  return transaction.type === 'encoded';
}

function isDecodedTransaction(transaction: AnyTransaction): transaction is AnyDecodedTransaction {
  return transaction.type === 'decoded';
}

async function wrapTransaction(transaction: AnyTransaction, route: AnyAccount[], api: ApiPromise) {
  let wrapped: AnyTransaction = transaction;

  for (const account of route) {
    const result: AnyTransaction | null = await wrapTransactionTransformer(wrapped, { account, route, api });
    if (nonNullable(result)) {
      wrapped = result;
    }
  }
  return wrapped;
}

/**
 * Wraps transaction with accounts to legacy format.
 *
 * @deprecated
 */
async function wrapLegacyTransaction(transaction: DeprecatedTransaction, route: AnyAccount[], api: ApiPromise) {
  let wrapped: DeprecatedTransaction = transaction;

  for (const account of route) {
    const result: DeprecatedTransaction | null = await wrapLegacyTransactionTransformer(wrapped, {
      account,
      route,
      api,
    });
    if (nonNullable(result)) {
      wrapped = result;
    }
  }
  return wrapped;
}

async function unwrapTransaction(transaction: AnyTransaction, api: ApiPromise) {
  const decoded = decodeTransaction(transaction, api);
  const list = [decoded];
  let last: AnyDecodedTransaction | null = decoded;

  while (nonNullable(last)) {
    const childTransaction = unwrapTransactionTransformer(last, { api });
    if (nonNullable(childTransaction)) {
      last = decodeTransaction(childTransaction, api);
      list.push(last);
    } else {
      last = null;
    }
  }
  return list;
}

function createExtrinsicFromCallData(callData: string, api: ApiPromise): Extrinsic {
  const call = api.registry.createType('Call', callData);
  return api.tx(call);
}

function createExtrinsic(transaction: AnyTransaction, api: ApiPromise): Extrinsic {
  try {
    const encodedExtrinsic = encodeTransaction(transaction, api);
    return createExtrinsicFromCallData(encodedExtrinsic.callData, api);
  } catch (error) {
    try {
      // fail-safe for transactions that are not supported yet. not the best solution, but it works for now.
      return unsafe_createExtrinsicFromAnyTransaction(transaction, api);
    } catch {
      throw error;
    }
  }
}

function unsafe_createExtrinsicFromAnyTransaction(transaction: AnyTransaction, api: ApiPromise): Extrinsic {
  if (isEncodedTransaction(transaction)) {
    return createExtrinsicFromCallData(transaction.callData, api);
  }

  const sectionConstructor = api.tx[transaction.section];
  if (nullable(sectionConstructor)) {
    throw new Error(`Section ${transaction.section} not found in api for chain ${api.genesisHash.toHex()}`);
  }

  const extrinsicConstructor = sectionConstructor[transaction.method];
  if (nullable(extrinsicConstructor)) {
    throw new Error(
      `Method ${transaction.section}.${transaction.method} not found in api for chain ${api.genesisHash.toHex()}`,
    );
  }

  const constructorArguments: unknown[] = [];

  for (const arg of extrinsicConstructor.meta.args) {
    const key = arg.name.toString();
    const value = (transaction.args as Record<string, unknown>)[key];
    if (value === undefined) {
      throw new Error(`Missing argument ${key} for transaction ${transaction.section}.${transaction.method}`);
    }

    constructorArguments.push(api.createType(arg.type.toString(), value));
  }

  return extrinsicConstructor(...constructorArguments);
}

function createEncodedTransactionFromExtrinsic(extrinsic: Extrinsic): EncodedTransaction {
  return {
    type: 'encoded',
    callData: extrinsic.method.toHex(),
  };
}

function encodeTransaction(transaction: AnyTransaction, api: ApiPromise): EncodedTransaction {
  if (isEncodedTransaction(transaction)) {
    return transaction;
  }

  const callData = encodeTransactionTransformer(transaction, { api });
  if (nullable(callData)) {
    const error = new Error(`Serializer for transaction ${transaction.section}.${transaction.method} not found`);
    error.cause = transaction;
    throw error;
  }

  return {
    type: 'encoded',
    callData,
  };
}

function decodeTransaction(transaction: AnyTransaction, api: ApiPromise): AnyDecodedTransaction {
  if (isDecodedTransaction(transaction)) {
    return transaction;
  }

  const decoded = createExtrinsic(transaction, api);
  const result = decodeTransactionTransformer(decoded);
  if (nullable(result)) {
    const error = new Error("Can't decode extrinsic");
    error.cause = transaction;
    throw error;
  }

  return result;
}

async function getExtrinsicFee(extrinsic: Extrinsic) {
  const { partialFee } = await extrinsic.paymentInfo(extrinsic.signer);
  return partialFee.toBn();
}

async function getSplitExtrinsicFee(extrinsic: Extrinsic, api: ApiPromise) {
  const parts = await splitExtrinsic(extrinsic, api);
  const fees = await Promise.all(parts.map(getExtrinsicFee));
  return fees.reduce((acc, fee) => acc.add(fee), BN_ZERO);
}

async function getTransactionFee(transaction: AnyTransaction, signatory: AccountId, api: ApiPromise) {
  const extrinsic = createExtrinsic(transaction, api);
  const { partialFee } = await extrinsic.paymentInfo(signatory);
  return partialFee.toBn();
}

async function getExtrinsicWeight(extrinsic: Extrinsic) {
  const { weight } = await extrinsic.paymentInfo(extrinsic.signer);
  return weight;
}

async function getTransactionWeight(transaction: AnyTransaction, api: ApiPromise) {
  const extrinsic = createExtrinsic(transaction, api);
  return getExtrinsicWeight(extrinsic);
}

function isBatchExtrinsic(extrinsic: Extrinsic) {
  return (
    extrinsic.method.section === 'utility' && ['batchAll', 'batch', 'forceBatch'].includes(extrinsic.method.method)
  );
}

async function getBlockLimit(api: ApiPromise): Promise<BlockWeight> {
  const maxExtrinsicWeight = api.consts.system.blockWeights.perClass.normal.maxExtrinsic.unwrapOrDefault();
  const maxExtrinsic = BlockWeight.fromWeight(maxExtrinsicWeight);

  const maxBlockWeight = api.consts.system.blockWeights.maxBlock;
  const maxBlock = BlockWeight.fromWeight(maxBlockWeight);

  const blockWeight = await api.query.system.blockWeight();

  const usedSpaceInLastBlock = new BlockWeight(
    blockWeight.normal.refTime
      .toBn()
      .add(blockWeight.operational.refTime.toBn())
      .add(blockWeight.mandatory.refTime.toBn()),
    (blockWeight.normal.proofSize?.toBn?.() ?? BN_ZERO)
      .add(blockWeight.operational.proofSize?.toBn?.() ?? BN_ZERO)
      .add(blockWeight.mandatory.proofSize?.toBn?.() ?? BN_ZERO),
  );

  const freeSpaceInLastBlock = new BlockWeight(
    maxBlock.refTime.sub(usedSpaceInLastBlock.refTime),
    maxBlock.proofSize.sub(usedSpaceInLastBlock.proofSize),
  );

  return BlockWeight.takeMinimums(maxExtrinsic.withMargin(), freeSpaceInLastBlock.withMargin());
}

async function splitCallsByWeight(api: ApiPromise, calls: Call[], budget: BlockWeight) {
  const result: Extrinsic[][] = [[]];
  let totalWeight = new BlockWeight(BN_ZERO, BN_ZERO);

  const txsWeights: Partial<Record<string, Weight>> = {};

  for (const call of calls) {
    const key = `${call.section}.${call.method}`;
    const extrinsic = api.tx(call);
    const weight = txsWeights[key] || (await getExtrinsicWeight(extrinsic));
    if (!txsWeights[key]) {
      txsWeights[key] = weight;
    }

    const callWeight = BlockWeight.fromWeight(weight);
    const newTotalWeight = totalWeight.add(callWeight);

    if (newTotalWeight.fitsIn(budget) && result.length > 0) {
      const lastBuffer = result.at(-1);
      if (lastBuffer) {
        lastBuffer.push(extrinsic);
      }
      totalWeight = newTotalWeight;
    } else {
      result.push([extrinsic]);
      totalWeight = callWeight;
    }
  }
  return result;
}

type CallWrapper = {
  section: string;
  method: string;
  innerCallIndex: number;
  declaresInnerWeight: boolean;
};

const CALL_WRAPPERS: CallWrapper[] = [
  { section: 'multisig', method: 'asMulti', innerCallIndex: 3, declaresInnerWeight: true },
  { section: 'proxy', method: 'proxy', innerCallIndex: 2, declaresInnerWeight: false },
  { section: 'utility', method: 'asDerivative', innerCallIndex: 1, declaresInnerWeight: false },
];

function findCallWrapper(extrinsic: Extrinsic): CallWrapper | null {
  const { section, method } = extrinsic.method;

  return CALL_WRAPPERS.find(w => w.section === section && w.method === method) ?? null;
}

async function rewrapWithInner(
  wrapped: Extrinsic,
  wrapper: CallWrapper,
  newInner: Extrinsic,
  api: ApiPromise,
): Promise<Extrinsic> {
  const args: unknown[] = [...wrapped.args];
  args[wrapper.innerCallIndex] = newInner.method;

  if (wrapper.declaresInnerWeight && args.length > 0) {
    args[args.length - 1] = await getExtrinsicWeight(newInner);
  }

  const section = api.tx[wrapped.method.section];
  const method = section?.[wrapped.method.method];
  if (!method) {
    throw new Error(`Cannot rewrap extrinsic ${wrapped.method.section}.${wrapped.method.method}`);
  }
  return method(...args);
}

async function subtractWrapperOverhead(
  budget: BlockWeight,
  wrapped: Extrinsic,
  inner: Extrinsic,
): Promise<BlockWeight> {
  const wrappedWeight = BlockWeight.fromWeight(await getExtrinsicWeight(wrapped));
  const innerWeight = BlockWeight.fromWeight(await getExtrinsicWeight(inner));

  return new BlockWeight(
    BN.max(budget.refTime.sub(BN.max(wrappedWeight.refTime.sub(innerWeight.refTime), BN_ZERO)), BN_ZERO),
    BN.max(budget.proofSize.sub(BN.max(wrappedWeight.proofSize.sub(innerWeight.proofSize), BN_ZERO)), BN_ZERO),
  );
}

async function splitExtrinsic(extrinsic: Extrinsic, api: ApiPromise, budget?: BlockWeight): Promise<Extrinsic[]> {
  const effectiveBudget = budget ?? (await getBlockLimit(api));

  if (isBatchExtrinsic(extrinsic)) {
    const callsArg = extrinsic.args.at(0);
    const calls = (callsArg && Array.isArray(callsArg) ? callsArg : []) as Call[];
    const chunks = await splitCallsByWeight(api, calls, effectiveBudget);

    return chunks
      .map(chunk => {
        if (chunk.length === 0) return null;
        if (chunk.length === 1) return chunk.at(0);
        return api.tx.utility.batchAll(chunk);
      })
      .filter(nonNullable);
  }

  const wrapper = findCallWrapper(extrinsic);
  if (wrapper) {
    const innerArg = extrinsic.args.at(wrapper.innerCallIndex);
    const innerCall = innerArg as Call | undefined;

    if (innerCall?.section && innerCall.method) {
      const innerExtrinsic = api.tx(innerCall);
      const innerBudget = await subtractWrapperOverhead(effectiveBudget, extrinsic, innerExtrinsic);
      const splitInner = await splitExtrinsic(innerExtrinsic, api, innerBudget);

      if (splitInner.length > 1) {
        return Promise.all(splitInner.map(inner => rewrapWithInner(extrinsic, wrapper, inner, api)));
      }
    }
  }

  return [extrinsic];
}

const INNER_CALL_RECURSION_LIMIT = 16;

function getInnerCallsFromCall(call: Call, proxyTarget?: AccountId, depth = 0): Call[] {
  if (depth >= INNER_CALL_RECURSION_LIMIT) return [call];

  const next = depth + 1;

  if (call.section === 'utility') {
    if (['batchAll', 'batch', 'forceBatch'].includes(call.method)) {
      const callsArg = call.args?.at?.(0) || call.args?.[0];
      const calls = (callsArg && Array.isArray(callsArg) ? callsArg : []) as Call[];

      return calls.flatMap(nested => getInnerCallsFromCall(nested, proxyTarget, next));
    }
    if (call.method === 'withWeight') {
      return getInnerCallsFromCall(call.args[0] as Call, proxyTarget, next);
    }
    if (call.method === 'dispatchAs' || call.method === 'asDerivative') {
      return getInnerCallsFromCall(call.args[1] as Call, proxyTarget, next);
    }
  }

  if (proxyTarget && call.section === 'proxy' && call.method === 'proxy') {
    const realArg = call.args[0] as { isId?: boolean; asId?: { toHex(): string }; toHex?: () => string };
    const real = realArg?.isId ? realArg.asId?.toHex() : realArg?.toHex?.();
    if (real === proxyTarget) {
      return getInnerCallsFromCall(call.args[2] as Call, proxyTarget, next);
    }
  }

  return [call];
}

type CoreCallData = {
  callData: HexString;
  callHash: HexString;
  proxiedAccountId?: AccountId;
};

const CORE_CALL_UNWRAP_LIMIT = 8;

function createCallFromArg(api: ApiPromise, arg: unknown): Call | null {
  if (!arg || typeof arg !== 'object' || !('toHex' in arg) || typeof arg.toHex !== 'function') {
    return null;
  }

  try {
    return api.registry.createType<Call>('Call', arg.toHex());
  } catch {
    return null;
  }
}

function getInnerWrapperCall(api: ApiPromise, call: Call): Call | null {
  if (call.section === 'proxy' && call.method === 'proxy') {
    return createCallFromArg(api, call.args[2]);
  }

  if ((call.section === 'multisig' || call.section === 'utility') && call.method === 'asMulti') {
    return createCallFromArg(api, call.args[3]);
  }

  if ((call.section === 'multisig' || call.section === 'utility') && call.method === 'asMultiThreshold1') {
    return createCallFromArg(api, call.args[1]);
  }

  return null;
}

function getProxiedAccountIdFromCall(call: Call): AccountId | undefined {
  if (call.section !== 'proxy' || call.method !== 'proxy') return undefined;

  const real = call.args[0]?.toString();
  return real ? toAccountId(real) : undefined;
}

function getCoreCallData(
  api: ApiPromise | null | undefined,
  callData: HexString | null | undefined,
): CoreCallData | null {
  if (!api || !callData) return null;

  try {
    let call = api.registry.createType<Call>('Call', callData);
    let proxiedAccountId: AccountId | undefined;

    for (let depth = 0; depth < CORE_CALL_UNWRAP_LIMIT; depth++) {
      proxiedAccountId ??= getProxiedAccountIdFromCall(call);

      const innerCall = getInnerWrapperCall(api, call);
      if (!innerCall) break;

      call = innerCall;
    }

    return {
      callData: call.toHex(),
      callHash: call.hash.toHex(),
      ...(proxiedAccountId ? { proxiedAccountId } : {}),
    };
  } catch {
    return null;
  }
}

const decodeDispatchError = (error: DispatchError | SpRuntimeDispatchError, registry: Registry): string => {
  let errorInfo = error.toString();

  if (error.isModule) {
    const decoded = registry.findMetaError(error.asModule);

    errorInfo = decoded.name
      .split(/(?=[A-Z])/)
      .map(w => w.toLowerCase())
      .join(' ');
  }

  return errorInfo;
};

type SubmitResult =
  | {
      executed: true;
      params: ExtrinsicResultParams;
    }
  | {
      executed: false;
      error: string;
    };

async function submitExtrinsic(
  extrinsic: Extrinsic,
  signature: HexString,
  payload: Uint8Array,
  signatory: AccountId,
  api: ApiPromise,
): Promise<SubmitResult> {
  return new Promise<SubmitResult>(resolve => {
    try {
      extrinsic.addSignature(signatory, hexToU8a(signature), payload);
      extrinsic
        .send(result => {
          const { status, events, txHash, txIndex, blockNumber, dispatchError, internalError } = result as any;

          const actualTxHash = txHash.toHex();
          const extrinsicIndex = txIndex;
          let isFinalApprove = false;
          let multisigError = '';
          let proxyError = '';

          if (internalError) {
            resolve({
              executed: false,
              error: internalError.message,
            });
            return;
          }

          if (dispatchError) {
            resolve({
              executed: false,
              error: decodeDispatchError(dispatchError, extrinsic.registry),
            });
            return;
          }

          if (status.isInvalid) {
            resolve({
              executed: false,
              error: 'Invalid transaction',
            });
          }

          if (status.isInBlock) {
            for (const { event, phase } of events) {
              if (!phase.isApplyExtrinsic || !phase.asApplyExtrinsic.eq(txIndex)) continue;

              if (api.events.multisig.MultisigExecuted.is(event)) {
                isFinalApprove = true;
                multisigError = event.data[4].isErr ? decodeDispatchError(event.data[4].asErr, extrinsic.registry) : '';
              }

              if (api.events.proxy?.ProxyExecuted?.is(event) && !proxyError && event.data[0].isErr) {
                proxyError = decodeDispatchError(event.data[0].asErr, extrinsic.registry);
              }

              if (api.events.system.ExtrinsicSuccess.is(event)) {
                resolve({
                  executed: true,
                  params: {
                    timepoint: {
                      index: extrinsicIndex,
                      height: blockNumber.toNumber(),
                    },
                    signature,
                    extrinsicHash: actualTxHash,
                    isFinalApprove,
                    multisigError,
                    proxyError,
                  },
                });
              }
            }
          }
        })
        .catch(error => {
          resolve({
            executed: false,
            error: (error as Error).message || 'Transaction submission failed',
          });
        });
    } catch (error) {
      resolve({
        executed: false,
        error: (error as Error).message || 'Failed to prepare transaction',
      });
    }
  });
}

export const transactionService = {
  wrapTransactionTransformer,
  wrapLegacyTransactionTransformer,
  unwrapTransactionTransformer,
  encodeTransactionTransformer,
  decodeTransactionTransformer,

  isEncodedTransaction,
  isDecodedTransaction,

  isBatchExtrinsic,

  wrapTransaction,
  wrapLegacyTransaction,
  unwrapTransaction,
  encodeTransaction,
  decodeTransaction,

  unsafe_createExtrinsicFromAnyTransaction,
  createEncodedTransactionFromExtrinsic,
  createExtrinsicFromCallData,
  createExtrinsic,

  getExtrinsicFee,
  getSplitExtrinsicFee,
  getTransactionFee,
  getExtrinsicWeight,
  getTransactionWeight,

  getInnerCallsFromCall,
  getCoreCallData,

  splitExtrinsic,
  submitExtrinsic,
};
