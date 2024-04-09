import { ApiPromise } from '@polkadot/api';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { hexToU8a } from '@polkadot/util';
import { construct, TypeRegistry, UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { Weight } from '@polkadot/types/interfaces';
import { blake2AsU8a, signatureVerify } from '@polkadot/util-crypto';
import { useState } from 'react';

import { Transaction, TransactionType } from '@entities/transaction/model/transaction';
import { createTxMetadata, toAccountId, dictionary } from '@shared/lib/utils';
import { getExtrinsic, getUnsignedTransaction, wrapAsMulti, wrapAsProxy } from './extrinsicService';
import {
  AccountId,
  Address,
  ChainId,
  HexString,
  Threshold,
  Account,
  Wallet,
  MultisigAccount,
  ProxiedAccount,
} from '@shared/core';
import { decodeDispatchError } from './common/utils';
import { useCallDataDecoder } from './callDataDecoder';
import {
  ITransactionService,
  HashData,
  ExtrinsicResultParams,
  WrapAsMulti,
  TxWrappers_OLD,
  TxWrapper,
  MultisigTxWrapper,
  ProxyTxWrapper,
  WrapperKind,
} from './common/types';
import { walletUtils, accountUtils } from '../../wallet';

const shouldWrapAsMulti = (wrapper: TxWrappers_OLD): wrapper is WrapAsMulti =>
  'signatoryId' in wrapper && 'account' in wrapper;

export const transactionService = {
  hasMultisig,
  hasProxy,

  getTransactionFee,
  getMultisigDeposit,

  getSignedExtrinsic,
  submitAndWatchExtrinsic,

  getTxWrappers,
  getWrappedTransaction,
};

async function getTransactionFee(transaction: Transaction, api: ApiPromise): Promise<string> {
  const extrinsic = getExtrinsic[transaction.type](transaction.args, api);
  const paymentInfo = await extrinsic.paymentInfo(transaction.address);

  return paymentInfo.partialFee.toString();
}

function getMultisigDeposit(threshold: Threshold, api: ApiPromise): string {
  const { depositFactor, depositBase } = api.consts.multisig;
  const deposit = depositFactor.muln(threshold).add(depositBase);

  return deposit.toString();
}

async function getSignedExtrinsic(
  unsigned: UnsignedTransaction,
  signature: HexString,
  api: ApiPromise,
): Promise<string> {
  const metadataRpc = await api.rpc.state.getMetadata();

  return construct.signedTx(unsigned, signature, {
    registry: api.registry as TypeRegistry,
    metadataRpc: metadataRpc.toHex(),
  });
}

function submitAndWatchExtrinsic(
  tx: string,
  unsigned: UnsignedTransaction,
  api: ApiPromise,
  callback: (executed: boolean, params: ExtrinsicResultParams | string) => void,
) {
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
  accounts: Account[];
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

function getMultisigWrapper({ wallets, accounts, account, signatories = [] }: Omit<TxWrappersParams, 'wallet'>) {
  const signersMap = dictionary((account as MultisigAccount).signatories, 'accountId', () => true);

  const signers = wallets.reduce<Account[]>((acc, wallet) => {
    const walletAccounts = accountUtils.getWalletAccounts((wallet as Wallet).id, accounts);
    const signer = walletAccounts.find((a) => signersMap[a.accountId]);

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
    accounts,
    account: signatoryAccount as Account,
    signatories: signatories.slice(1),
  });

  return [wrapper, ...nextWrappers];
}

function getProxyWrapper({ wallets, accounts, account, signatories = [] }: Omit<TxWrappersParams, 'wallet'>) {
  const proxiesMap = wallets.reduce<{ wallet: Wallet; account: Account }[]>((acc, wallet) => {
    const walletAccounts = accountUtils.getWalletAccounts(wallet.id, accounts);
    const match = walletAccounts.find((a) => a.accountId === (account as ProxiedAccount).proxyAccountId);

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
    accounts,
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

export const useTransaction = (): ITransactionService => {
  const { decodeCallData } = useCallDataDecoder();

  const [txs, setTxs] = useState<Transaction[]>([]);
  const [wrappers, setWrappers] = useState<TxWrappers_OLD[]>([]);

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

  const buildTransaction = (
    type: TransactionType,
    address: Address,
    chainId: ChainId,
    args: Record<string, any>,
  ): Transaction => {
    return {
      type: type,
      address: address,
      chainId: chainId,
      args: args,
    };
  };

  return {
    createPayload,
    getExtrinsicWeight,
    getTxWeight,
    getTransactionHash,
    decodeCallData,
    verifySignature,
    txs,
    setTxs,
    setWrappers,
    wrapTx,
    buildTransaction,
  };
};
