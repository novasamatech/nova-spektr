import { type ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';

import { proxyService } from '@/shared/api/proxy';
import {
  type Account,
  type Address,
  type Asset,
  type Balance,
  type BasketTransaction,
  type Chain,
  type ChainId,
  type Connection,
  type Conviction,
  type ProxiedAccount,
  type ProxyType,
  type Transaction,
  TransactionType,
  type Validator,
  type Wallet,
} from '@/shared/core';
import { getAssetById, redeemableAmount, toAccountId, toAddress, transferableAmount } from '@/shared/lib/utils';
import { convictionVotingPallet } from '@/shared/pallet/convictionVoting';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { balanceUtils } from '@/entities/balance';
import { governanceService, votingService } from '@/entities/governance';
import { networkUtils } from '@/entities/network';
import { eraService, useStakingData, validatorsService } from '@/entities/staking';
import { transactionService } from '@/entities/transaction';
import { type UnlockFormData } from '@/features/governance/types/structs';
import { type CollectiveVoteConfirm, type VoteConfirm } from '@/features/operations/OperationsConfirm';
import { type RemoveVoteConfirm } from '@/features/operations/OperationsConfirm/Referendum/RemoveVote/model/confirm-model';
import { type FeeMap } from '@/features/operations/OperationsValidation';

import { getCoreTx } from './utils';

type PrepareDataParams = {
  wallets: Wallet[];
  chains: Record<ChainId, Chain>;
  apis: Record<ChainId, ApiPromise>;
  transactions: BasketTransaction[];
  connections: Record<ChainId, Connection>;
  feeMap: FeeMap;
  balances: Balance[];
};

export type DataParams = Omit<PrepareDataParams, 'transactions'> & { transaction: BasketTransaction };

export const prepareTransaction = {
  prepareTransferTransactionData,
  prepareAddProxyTransaction,
  prepareAddPureProxiedTransaction,
  prepareRemovePureProxiedTransaction,
  prepareRemoveProxyTransaction,
  prepareWithdrawTransaction,
  prepareBondNominateTransaction,
  prepareBondExtraTransaction,
  prepareNominateTransaction,
  prepareRestakeTransaction,
  prepareUnstakeTransaction,
  preparePayeeTransaction,
  prepareUnlockTransaction,
  prepareDelegateTransaction,
  prepareRevokeDelegationTransaction,
  prepareEditDelegationTransaction,
  prepareVoteTransaction,
  prepareRemoveVoteTransaction,
  prepareCollectiveVoteTransaction,
};

async function getTransactionData(
  transaction: BasketTransaction,
  feeMap: FeeMap,
  apis: Record<`0x${string}`, ApiPromise>,
  chains: Record<`0x${string}`, Chain>,
  wallets: Wallet[],
) {
  const chainId = transaction.coreTx.chainId as ChainId;
  const fee =
    feeMap[chainId][transaction.coreTx.type] ||
    (await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]));

  const chain = chains[chainId]!;
  const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
  const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));

  return { chainId, chain, account, fee };
}

type TransferInput = {
  xcmChain: Chain;
  chain: Chain;
  asset: Asset;
  account: Account;
  amount: string;
  destination: Address;
  description: string;

  fee: string;
  xcmFee: string;
  multisigDeposit: string;
};

async function prepareTransferTransactionData({ transaction, wallets, chains, apis, feeMap }: DataParams) {
  const { chain, account, fee } = await getTransactionData(transaction, feeMap, apis, chains, wallets);

  const xcmChain = chains[transaction.coreTx.args.destinationChain] || chain;

  return {
    id: transaction.id,
    xcmChain,
    chain,
    asset: getAssetById(transaction.coreTx.args.asset, chain.assets),
    account,
    amount: transaction.coreTx.args.value,
    destination: transaction.coreTx.args.dest,
    description: '',

    fee,
    xcmFee: transaction.coreTx.args.xcmFee || '0',
    multisigDeposit: '0',
  } as TransferInput;
}

type AddProxyInput = {
  chain: Chain;
  account: Account;
  signatory?: Account;
  proxyType: ProxyType;
  delegate: Address;
  description: string;

  transaction: Transaction;
  proxiedAccount?: ProxiedAccount;

  proxyDeposit: string;
  proxyNumber: number;
};

async function prepareAddProxyTransaction({ transaction, wallets, chains, apis, feeMap }: DataParams) {
  const { chainId, chain, account, fee } = await getTransactionData(transaction, feeMap, apis, chains, wallets);

  const proxy = await proxyService.getProxiesForAccount(apis[chainId], transaction.coreTx.address);
  const proxyDeposit = proxyService.getProxyDeposit(apis[chainId], proxy.deposit, proxy.accounts.length + 1);

  return {
    id: transaction.id,
    chain,
    account,
    proxyType: transaction.coreTx.args.proxyType,
    delegate: transaction.coreTx.args.delegate,
    description: '',

    transaction: transaction.coreTx,
    proxyDeposit,
    proxyNumber: proxy.accounts.length + 1,
    fee,
  } as AddProxyInput;
}

type AddPureProxiedInput = {
  chain: Chain;
  account: Account;
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  description: string;
  fee: string;
  multisigDeposit: string;
};

async function prepareAddPureProxiedTransaction({ transaction, wallets, chains, apis, feeMap }: DataParams) {
  const { chainId, chain, account, fee } = await getTransactionData(transaction, feeMap, apis, chains, wallets);

  const proxyDeposit = proxyService.getProxyDeposit(apis[chainId], '0', 1);

  return {
    id: transaction.id,
    chain,
    account,
    amount: transaction.coreTx.args.value,
    description: '',
    fee,
    proxyDeposit,
    multisigDeposit: '0',
  } as AddPureProxiedInput;
}

type RemoveProxyInput = {
  chain: Chain;
  account: Account;
  signatory?: Account;
  proxyType: ProxyType;
  delegate: Address;
  description: string;
  transaction: Transaction;
  proxiedAccount?: ProxiedAccount;
};

async function prepareRemoveProxyTransaction({ transaction, wallets, chains, apis, feeMap }: DataParams) {
  const { chain, account, fee } = await getTransactionData(transaction, feeMap, apis, chains, wallets);

  return {
    id: transaction.id,
    chain,
    account,
    proxyType: transaction.coreTx.args.proxyType,
    delegate: transaction.coreTx.args.delegate,
    description: '',

    transaction: transaction.coreTx,
    fee,
  } as RemoveProxyInput;
}

type RemovePureProxiedInput = {
  signatory?: Account;
  description: string;
  transaction: Transaction;
  spawner: AccountId;
  proxyType: ProxyType;
  chain?: Chain;
  account?: Account;
  proxiedAccount?: ProxiedAccount;
};

async function prepareRemovePureProxiedTransaction({ transaction, wallets, chains, apis, feeMap }: DataParams) {
  const { chain, account, fee } = await getTransactionData(transaction, feeMap, apis, chains, wallets);

  return {
    id: transaction.id,
    chain,
    account,
    proxyType: transaction.coreTx.args.proxyType,
    spawner: toAccountId(transaction.coreTx.args.spawner),
    description: '',

    transaction: transaction.coreTx,
    fee,
  } as RemovePureProxiedInput;
}

type BondNominateInput = {
  chain: Chain;
  asset: Asset;

  shards: Account[];
  validators: Validator[];
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  amount: string;
  destination: string;
  description: string;
};

async function prepareBondNominateTransaction({ transaction, wallets, chains, apis, connections, feeMap }: DataParams) {
  const bondTx = transaction.coreTx.args.transactions.find((t: Transaction) => t.type === TransactionType.BOND)!;
  const nominateTx = transaction.coreTx.args.transactions.find(
    (t: Transaction) => t.type === TransactionType.NOMINATE,
  )!;

  const { chainId, chain, account, fee } = await getTransactionData(transaction, feeMap, apis, chains, wallets);

  const era = await eraService.getActiveEra(apis[chainId]);
  const isLightClient = networkUtils.isLightClientConnection(connections[chain!.chainId]);
  const validatorsMap = await validatorsService.getValidatorsWithInfo(apis[chainId], era || 0, isLightClient);

  const validators = nominateTx.args.targets.map((address: string) => validatorsMap[address]);

  return {
    id: transaction.id,
    chain,
    asset: chain.assets[0],
    shards: [account],
    amount: bondTx.args.value,
    validators,
    destination: bondTx.args.dest,
    description: '',

    fee,
    multisigDeposit: '0',
  } as BondNominateInput;
}

type BondExtraInput = {
  chain: Chain;
  asset: Asset;

  shards: Account[];
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  amount: string;
  description: string;
};

async function prepareBondExtraTransaction({ transaction, wallets, chains, apis, feeMap }: DataParams) {
  const { chain, account, fee } = await getTransactionData(transaction, feeMap, apis, chains, wallets);

  return {
    id: transaction.id,
    chain,
    asset: chain.assets[0],
    shards: [account],
    amount: transaction.coreTx.args.maxAdditional,
    description: '',

    fee,
    xcmFee: transaction.coreTx.args.xcmFee || '0',
    multisigDeposit: '0',
  } as BondExtraInput;
}

type NominateInput = {
  chain: Chain;
  asset: Asset;

  shards: Account[];
  validators: Validator[];
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  description: string;
};

async function prepareNominateTransaction({ transaction, wallets, chains, connections, apis, feeMap }: DataParams) {
  const { chainId, chain, account, fee } = await getTransactionData(transaction, feeMap, apis, chains, wallets);

  const era = await eraService.getActiveEra(apis[chainId]);
  const isLightClient = networkUtils.isLightClientConnection(connections[chainId]);
  const validatorsMap = await validatorsService.getValidatorsWithInfo(apis[chainId], era || 0, isLightClient);

  const validators = transaction.coreTx.args.targets.map((address: string) => validatorsMap[address]);

  return {
    id: transaction.id,
    chain,
    asset: chain.assets[0],
    shards: [account],
    validators,
    destination: transaction.coreTx.args.dest,
    description: '',

    fee,
  } as NominateInput;
}

type PayeeInput = {
  chain: Chain;
  asset: Asset;

  shards: Account[];
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  destination?: string;
  description: string;
};

async function preparePayeeTransaction({ transaction, wallets, chains, apis, feeMap }: DataParams) {
  const { chain, account, fee } = await getTransactionData(transaction, feeMap, apis, chains, wallets);

  return {
    id: transaction.id,
    chain,
    asset: chain.assets[0],
    shards: [account],
    destination: transaction.coreTx.args.dest,
    description: '',

    fee,
  } as PayeeInput;
}

type UnstakeInput = {
  chain: Chain;
  asset: Asset;
  shards: Account[];
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  amount: string;
  description: string;

  fee: string;
  totalFee: string;
  multisigDeposit: string;
};

async function prepareUnstakeTransaction({ transaction, wallets, chains, apis, feeMap }: DataParams) {
  const coreTx = getCoreTx(transaction);

  const { chain, account, fee } = await getTransactionData(transaction, feeMap, apis, chains, wallets);

  return {
    id: transaction.id,
    chain,
    asset: chain.assets[0],
    shards: [account],
    amount: coreTx.args.value,
    description: '',

    fee,
    totalFee: '0',
    multisigDeposit: '0',
  } as UnstakeInput;
}

type RestakeInput = {
  chain: Chain;
  asset: Asset;

  shards: Account[];
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  amount: string;
  description: string;
};

async function prepareRestakeTransaction({ transaction, wallets, chains, apis, feeMap }: DataParams) {
  const { chain, account, fee } = await getTransactionData(transaction, feeMap, apis, chains, wallets);

  return {
    id: transaction.id,
    chain,
    asset: chain.assets[0],
    shards: [account],
    amount: transaction.coreTx.args.value,
    description: '',

    fee,
    xcmFee: transaction.coreTx.args.xcmFee || '0',
    multisigDeposit: '0',
  } as RestakeInput;
}

type WithdrawInput = {
  chain: Chain;
  asset: Asset;
  shards: Account[];
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  amount: string;
  description: string;

  fee: string;
  totalFee: string;
  multisigDeposit: string;
};

async function prepareWithdrawTransaction({ transaction, wallets, chains, apis, feeMap }: DataParams) {
  const { chainId, chain, account, fee } = await getTransactionData(transaction, feeMap, apis, chains, wallets);
  const era = await eraService.getActiveEra(apis[chainId]);

  const staking = (await new Promise((resolve) => {
    useStakingData().subscribeStaking(chainId, apis[chainId], [transaction.coreTx.address], resolve);
  })) as any;

  const amount = redeemableAmount(staking?.[transaction.coreTx.address]?.unlocking, era || 0);

  return {
    id: transaction.id,
    chain,
    asset: chain.assets[0],
    shards: [account],
    amount,
    description: '',

    fee,
    totalFee: '0',
    multisigDeposit: '0',
  } as WithdrawInput;
}

async function prepareUnlockTransaction({ transaction, wallets, chains, apis, feeMap }: DataParams) {
  const coreTx = getCoreTx(transaction);

  const { chainId, chain, account, fee } = await getTransactionData(transaction, feeMap, apis, chains, wallets);

  const address = transaction.coreTx.address;
  const totalLock = await governanceService.getTrackLocks(apis[chainId], [address]).then((data) => {
    const lock = data[address];

    return Object.values(lock).reduce<BN>((acc, lock) => BN.max(lock, acc), BN_ZERO);
  });

  return {
    chain,
    id: transaction.id,
    shards: [account!],
    amount: coreTx.args.value,
    asset: chain.assets[0],
    signatory: null,

    fee,
    totalLock,
    totalFee: '0',
    multisigDeposit: '0',
  } satisfies UnlockFormData;
}

type DelegateInput = {
  id?: number;
  chain: Chain;
  asset: Asset;
  shards: Account[];
  transferable: string;
  locks: BN;

  tracks: number[];
  target: Address;
  conviction: Conviction;
  balance: string;

  description: string;

  fee: string;
  totalFee: string;
  multisigDeposit: string;
};

async function prepareDelegateTransaction({ transaction, wallets, chains, apis, feeMap, balances }: DataParams) {
  const { chainId, chain, account, fee } = await getTransactionData(transaction, feeMap, apis, chains, wallets);
  const asset = chain.assets[0];

  const transferable = transferableAmount(
    balanceUtils.getBalance(balances, account!.accountId, chainId, asset.assetId.toString()),
  );

  const locks = await governanceService.getTrackLocks(apis[chainId], [transaction.coreTx.address]).then((data) => {
    const lock = data[transaction.coreTx.address];

    return Object.values(lock).reduce<BN>((acc, lock) => BN.max(lock, acc), BN_ZERO);
  });

  const coreTxs = transaction.coreTx.args.transactions || [transaction.coreTx];

  return {
    id: transaction.id,
    chain,
    asset,
    transferable,

    shards: [account!],
    balance: coreTxs[0].args.balance,
    conviction: votingService.getConviction(coreTxs[0].args.conviction),
    target: coreTxs[0].args.target,
    tracks: coreTxs.map((t: Transaction) => t.args.track),
    description: '',
    locks,

    fee,
    totalFee: '0',
    multisigDeposit: '0',
  } satisfies DelegateInput;
}

async function prepareEditDelegationTransaction({ transaction, wallets, chains, apis, feeMap, balances }: DataParams) {
  const { chainId, chain, account, fee } = await getTransactionData(transaction, feeMap, apis, chains, wallets);
  const asset = chain.assets[0];

  const transferable = transferableAmount(
    balanceUtils.getBalance(balances, account!.accountId, chainId, asset.assetId.toString()),
  );

  const locks = await governanceService.getTrackLocks(apis[chainId], [transaction.coreTx.address]).then((data) => {
    const lock = data[transaction.coreTx.address];

    return Object.values(lock).reduce<BN>((acc, lock) => BN.max(lock, acc), BN_ZERO);
  });

  const coreTxs = transaction.coreTx.args.transactions?.filter(
    (t: Transaction) => t.type === TransactionType.DELEGATE,
  ) || [transaction.coreTx];

  return {
    id: transaction.id,
    chain,
    asset,
    transferable,

    shards: [account!],
    balance: coreTxs[0].args.balance,
    conviction: votingService.getConviction(coreTxs[0].args.conviction),
    target: coreTxs[0].args.target,
    tracks: coreTxs.map((t: Transaction) => t.args.track),
    description: '',
    locks,

    fee,
    totalFee: '0',
    multisigDeposit: '0',
  } satisfies DelegateInput;
}

type RevokeDelegationInput = {
  id?: number;
  chain: Chain;
  asset: Asset;
  account: Account;
  transferable: string;
  locks: BN;

  tracks: number[];
  target: Address;
  conviction: Conviction;
  balance: string;

  description: string;

  fee: string;
  totalFee: string;
  multisigDeposit: string;
};

async function prepareRevokeDelegationTransaction({
  transaction,
  wallets,
  chains,
  apis,
  feeMap,
  balances,
}: DataParams) {
  const { chainId, chain, account, fee } = await getTransactionData(transaction, feeMap, apis, chains, wallets);
  const asset = chain.assets[0];

  const transferable = transferableAmount(
    balanceUtils.getBalance(balances, account!.accountId, chainId, asset.assetId.toString()),
  );
  const locks = await governanceService.getTrackLocks(apis[chainId], [transaction.coreTx.address]).then((data) => {
    const lock = data[transaction.coreTx.address];

    return Object.values(lock).reduce<BN>((acc, lock) => BN.max(lock, acc), BN_ZERO);
  });

  const coreTxs = transaction.coreTx.args.transactions || [transaction.coreTx];

  const votes = await convictionVotingPallet.storage.votingFor(apis[chainId], [
    [transaction.coreTx.address, coreTxs[0].args.track],
  ]);

  const delegation = votes.find((vote) => vote.type === 'Delegating');

  return {
    id: transaction.id,
    chain,
    asset,
    transferable,

    account: account!,
    balance: delegation ? delegation.data.balance.toString() : coreTxs[0].args.balance,
    conviction: delegation ? delegation.data.conviction : votingService.getConviction(coreTxs[0].args.conviction),
    target: delegation ? toAddress(delegation.data.target, { prefix: chain.addressPrefix }) : coreTxs[0].args.target,
    tracks: coreTxs.map((t: Transaction) => t.args.track),
    description: '',
    locks,

    fee,
    totalFee: '0',
    multisigDeposit: '0',
  } satisfies RevokeDelegationInput;
}

async function prepareVoteTransaction({ transaction, wallets, chains, apis, feeMap }: DataParams) {
  const coreTx = getCoreTx(transaction);

  const { chainId, chain, account } = await getTransactionData(transaction, feeMap, apis, chains, wallets);
  const api = apis[chainId];

  return {
    id: transaction.id,
    api,
    chain,
    asset: chain.assets[0],
    account: account!,
    existingVote: coreTx.args.vote,
    signatory: null,
    wrappedTransactions: transactionService.getWrappedTransaction({
      api,
      addressPrefix: chain.addressPrefix,
      transaction: transaction.coreTx,
      txWrappers: transaction.txWrappers,
    }),
  } satisfies VoteConfirm;
}

async function prepareRemoveVoteTransaction({ transaction, wallets, chains, apis, feeMap }: DataParams) {
  const coreTxs = transaction.coreTx.args.transactions || [transaction.coreTx];
  const { chainId, chain, account } = await getTransactionData(transaction, feeMap, apis, chains, wallets);
  const api = apis[chainId];

  return {
    api,
    chain,
    id: transaction.id,
    account: account!,
    asset: chain.assets[0],
    votes: coreTxs.map((t: Transaction) => t.args),
    signatory: null,
    wrappedTransactions: transactionService.getWrappedTransaction({
      api,
      addressPrefix: chain.addressPrefix,
      transaction: transaction.coreTx,
      txWrappers: transaction.txWrappers,
    }),
  } satisfies RemoveVoteConfirm;
}

// TODO refactor this
async function prepareCollectiveVoteTransaction({ transaction, wallets, chains, apis, feeMap }: DataParams) {
  const coreTx = getCoreTx(transaction);

  const { chainId, chain, account, fee } = await getTransactionData(transaction, feeMap, apis, chains, wallets);
  const api = apis[chainId];

  return {
    api,
    chain,
    wallets,
    id: transaction.id,
    asset: chain.assets[0],
    account: account!,
    pallet: coreTx.args.pallet as CollectiveVoteConfirm['pallet'],
    aye: coreTx.args.aye,
    poll: coreTx.args.poll,
    rank: coreTx.args.rank,
    fee: new BN(fee),
    signatory: null,
    wrappedTransactions: transactionService.getWrappedTransaction({
      api,
      addressPrefix: chain.addressPrefix,
      transaction: transaction.coreTx,
      txWrappers: transaction.txWrappers,
    }),
  } satisfies CollectiveVoteConfirm;
}
