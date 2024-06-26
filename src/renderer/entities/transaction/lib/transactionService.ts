import { useState } from 'react';
import { ApiPromise } from '@polkadot/api';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { hexToU8a } from '@polkadot/util';
import { construct, UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { Weight } from '@polkadot/types/interfaces';
import { blake2AsU8a, signatureVerify } from '@polkadot/util-crypto';

import { Transaction, WrapperKind } from '@shared/core';
import { createTxMetadata, toAccountId, dictionary } from '@shared/lib/utils';
import { getExtrinsic, getUnsignedTransaction, wrapAsMulti, wrapAsProxy } from './extrinsicService';
import { decodeDispatchError } from './common/utils';
import { useCallDataDecoder } from './callDataDecoder';
import { walletUtils } from '../../wallet';
import type {
  AccountId,
  HexString,
  MultisigThreshold,
  Wallet,
  MultisigAccount,
  ProxiedAccount,
  Account,
  TxWrappers_OLD,
  WrapAsMulti,
  TxWrapper,
  MultisigTxWrapper,
  ProxyTxWrapper,
} from '@shared/core';
import { HashData, ITransactionService } from './common/types';

export const transactionService = {
  hasMultisig,
  hasProxy,

  getTransactionFee,
  getMultisigDeposit,

  createPayload,
  signAndSubmit,

  getTxWrappers,
  getWrappedTransaction,
};

const shouldWrapAsMulti = (wrapper: TxWrappers_OLD): wrapper is WrapAsMulti =>
  'signatoryId' in wrapper && 'account' in wrapper;

async function getTransactionFee(transaction: Transaction, api: ApiPromise): Promise<string> {
  const extrinsic = getExtrinsic[transaction.type](transaction.args, api);
  const paymentInfo = await extrinsic.paymentInfo(transaction.address);

  return paymentInfo.partialFee.toString();
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

      let actualTxHash = txHash.toHex();
      let isFinalApprove = false;
      let multisigError = '';
      let extrinsicIndex = txIndex;
      let extrinsicSuccess = false;

      if (status.isInBlock) {
        events.forEach(({ event, phase }: any) => {
          if (!phase.isApplyExtrinsic || !phase.asApplyExtrinsic.eq(txIndex)) return;

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
        });
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

function hasMultisig(txWrappers: TxWrapper[]): boolean {
  return txWrappers.some((wrapper) => wrapper.kind === WrapperKind.MULTISIG);
}

function hasProxy(txWrappers: TxWrapper[]): boolean {
  return txWrappers.some((wrapper) => wrapper.kind === WrapperKind.PROXY);
}

type TxWrappersParams = {
  wallets: Wallet[];
  wallet: Wallet;
  account: Account;
  signatories?: Account[];
};
/**
 * Get array of transaction wrappers (proxy/multisig)
 * Every wrapper recursively calls getTxWrappers until it finds regular account
 * @param wallet wallet that requires wrapping
 * @param params wallets, accounts and signatories
 * @return {Array}
 */
function getTxWrappers({ wallet, ...params }: TxWrappersParams): TxWrapper[] {
  if (walletUtils.isMultisig(wallet)) {
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
type WrappedTransactions = {
  wrappedTx: Transaction;
  coreTx: Transaction;
  multisigTx?: Transaction;
};
function getWrappedTransaction({ api, addressPrefix, transaction, txWrappers }: WrapperParams): WrappedTransactions {
  return txWrappers.reduce<WrappedTransactions>(
    (acc, txWrapper) => {
      if (hasMultisig([txWrapper])) {
        acc.coreTx = acc.wrappedTx;
        acc.wrappedTx = wrapAsMulti({
          api,
          addressPrefix,
          transaction: acc.wrappedTx,
          txWrapper: txWrapper as MultisigTxWrapper,
        });
        acc.multisigTx = acc.wrappedTx;
      }

      if (hasProxy([txWrapper])) {
        acc.wrappedTx = wrapAsProxy({
          addressPrefix,
          transaction: acc.wrappedTx,
          txWrapper: txWrapper as ProxyTxWrapper,
        });
      }

      return acc;
    },
    { wrappedTx: transaction, multisigTx: undefined, coreTx: transaction },
  );
}

async function createPayload(
  transaction: Transaction,
  api: ApiPromise,
): Promise<{
  unsigned: UnsignedTransaction;
  payload: Uint8Array;
}> {
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
}

export const useTransaction = (): ITransactionService => {
  const { decodeCallData } = useCallDataDecoder();

  const [txs, setTxs] = useState<Transaction[]>([]);
  const [wrappers, setWrappers] = useState<TxWrappers_OLD[]>([]);

  const getTransactionHash = (transaction: Transaction, api: ApiPromise): HashData => {
    const extrinsic = getExtrinsic[transaction.type](transaction.args, api);

    return {
      callData: extrinsic.method.toHex(),
      callHash: extrinsic.method.hash.toHex(),
    };
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

  const verifySignature = (payload: Uint8Array, signature: HexString, accountId: AccountId): Boolean => {
    const payloadToVerify = payload.length > 256 ? blake2AsU8a(payload) : payload;

    return signatureVerify(payloadToVerify, signature, accountId).isValid;
  };

  const wrapTx = (transaction: Transaction, api: ApiPromise, addressPrefix: number) => {
    wrappers.forEach((wrapper) => {
      if (shouldWrapAsMulti(wrapper)) {
        transaction = wrapAsMulti({
          api,
          addressPrefix,
          transaction,
          txWrapper: {
            kind: WrapperKind.MULTISIG,
            multisigAccount: wrapper.account,
            signatories: wrapper.account.signatories.map((s) => ({ accountId: s.accountId })) as Account[],
            signer: { accountId: wrapper.signatoryId } as Account,
          },
        });
      }
    });

    return transaction;
  };

  return {
    getExtrinsicWeight,
    getTxWeight,
    getTransactionHash,
    decodeCallData,
    verifySignature,
    txs,
    setTxs,
    setWrappers,
    wrapTx,
  };
};
