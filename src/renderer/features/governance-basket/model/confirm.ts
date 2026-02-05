import { type ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';
import { createEffect, sample } from 'effector';
import { createGate } from 'effector-react';

import {
  type BalanceMap,
  type Chain,
  type ChainId,
  type Connection,
  type Transaction,
  TransactionType,
} from '@/shared/core';
import { getNativeAsset, toAccountId, transferableAmount } from '@/shared/lib/utils';
import { convictionVotingPallet } from '@/shared/pallet/convictionVoting';
import { type AnyAccount } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { governanceService, votingService } from '@/entities/governance';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { type BasketTransaction } from '@/aggregates/basket-operations';
import { basketOperationsService } from '@/aggregates/basket-operations';
import {
  type DelegateConfirm,
  type EditDelegationConfirm,
  type RemoveVoteConfirm,
  type UnlockConfirm,
  type VoteConfirm,
  delegateConfirmModel,
  editDelegationConfirmModel,
  removeVoteConfirmModel,
  revokeDelegationConfirmModel,
  unlockConfirmModel,
  voteConfirmModel,
} from '@/features/operations/OperationsConfirm';
import { type RevokeDelegationConfirm } from '@/features/operations/OperationsConfirm/RevokeDelegation/model/confirm-model';

type DataParams = {
  accounts: AnyAccount[];
  chains: Record<ChainId, Chain>;
  apis: Record<ChainId, ApiPromise>;
  transaction: BasketTransaction;
  connections: Record<ChainId, Connection>;
  balances: BalanceMap;
};

const flow = createGate<BasketTransaction>();

const prepareUnlockDataFx = createEffect(async ({ transaction, accounts, chains, apis }: DataParams) => {
  const { chain, account, fee } = await basketOperationsService.getTransactionData(
    transaction,
    apis,
    chains,
    accounts,
  );

  assert(chain, 'Chain not found');

  const coreTx = basketOperationsService.getCoreTx(transaction);

  const totalLock = await governanceService
    .getTrackLocks(apis[chain.chainId]!, [transaction.coreTx.accountId])
    .then((data) => {
      const lock = data[transaction.coreTx.accountId]!;

      return Object.values(lock).reduce<BN>((acc, lock) => BN.max(lock, acc), BN_ZERO);
    });

  return {
    chain,
    id: transaction.id,
    amount: coreTx.args.value,
    asset: getNativeAsset(chain.assets),
    initiator: account!,
    signatory: account!,
    route: [account!],
    tx: transaction.coreTx,
    coreTx: transaction.coreTx,

    fee: fee.toString(),
    totalLock,
    totalFee: '0',
    multisigDeposit: '0',
  } satisfies UnlockConfirm;
});

const prepareDelegateDataFx = createEffect(async ({ transaction, accounts, chains, apis, balances }: DataParams) => {
  const { chain, account, fee } = await basketOperationsService.getTransactionData(
    transaction,
    apis,
    chains,
    accounts,
  );

  assert(chain, 'Chain not found');

  const asset = chain.assets?.[0];

  assert(account, 'Signing account not found');
  assert(asset, 'Native asset not found');

  const transferable = transferableAmount(
    balanceUtils.getBalance(balances, account.accountId, chain.chainId, asset.assetId),
  );

  const locks = await governanceService.getTrackLocks(apis[chain.chainId]!, [transaction.coreTx.accountId]).then((data) => {
    const lock = data[transaction.coreTx.accountId]!;

    return Object.values(lock).reduce<BN>((acc, lock) => BN.max(lock, acc), BN_ZERO);
  });

  const coreTxs = transaction.coreTx.args.transactions || [transaction.coreTx];

  return {
    id: transaction.id,
    chain,
    asset,
    transferable,

    balance: coreTxs[0].args.balance,
    conviction: votingService.getConviction(coreTxs[0].args.conviction),
    target: coreTxs[0].args.target,
    tracks: coreTxs.map((t: Transaction) => t.args.track),
    locks,
    signatory: account,
    initiator: account,
    route: [account],
    tx: transaction.coreTx,
    coreTx: transaction.coreTx,

    fee: fee.toString(),
    totalFee: '0',
    multisigDeposit: '0',
  } satisfies DelegateConfirm;
});

const prepareEditDelegationDataFx = createEffect(
  async ({ transaction, accounts, chains, apis, balances }: DataParams) => {
    const { chain, account, fee } = await basketOperationsService.getTransactionData(
      transaction,
      apis,
      chains,
      accounts,
    );

    assert(chain, 'Chain not found');

    const asset = chain.assets?.[0];

    assert(account, 'Signing account not found');
    assert(asset, 'Native asset not found');

    const transferable = transferableAmount(
      balanceUtils.getBalance(balances, account.accountId, chain.chainId, asset.assetId),
    );

    const locks = await governanceService.getTrackLocks(apis[chain.chainId]!, [transaction.coreTx.accountId]).then((data) => {
      const lock = data[transaction.coreTx.accountId]!;

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

      balance: coreTxs[0].args.balance,
      conviction: coreTxs[0].args.conviction,
      // TODO: Previous conviction should be received from chain
      previousConviction: coreTxs[0].args.previousConviction || 'None',
      target: coreTxs[0].args.target,
      tracks: coreTxs.map((t: Transaction) => t.args.track),
      locks,
      signatory: account!,
      route: [account!],
      tx: transaction.coreTx,
      coreTx: transaction.coreTx,
      initiator: account!,

      fee: fee.toString(),
      totalFee: fee.toString(),
      multisigDeposit: '0',
    } satisfies EditDelegationConfirm;
  },
);

const prepareRevokeDelegationDataFx = createEffect(
  async ({ transaction, accounts, chains, apis, balances }: DataParams) => {
    const { chain, account, fee } = await basketOperationsService.getTransactionData(
      transaction,
      apis,
      chains,
      accounts,
    );

    assert(chain, 'Chain not found');
    assert(account, 'Signing account not found');

    const asset = chain.assets?.[0];
    assert(asset, 'Native asset not found');

    const api = apis[chain.chainId]!;
    const transferable = transferableAmount(
      balanceUtils.getBalance(balances, account.accountId, chain.chainId, asset.assetId),
    );
    const locks = await governanceService.getTrackLocks(api, [transaction.coreTx.accountId]).then((data) => {
      const lock = data[transaction.coreTx.accountId]!;

      return Object.values(lock).reduce<BN>((acc, lock) => BN.max(lock, acc), BN_ZERO);
    });

    const coreTxs = transaction.coreTx.args.transactions || [transaction.coreTx];

    const votes = await convictionVotingPallet.storage.votingFor(api, [
      [transaction.coreTx.accountId, coreTxs[0].args.track],
    ]);

    const delegation = votes.find((vote) => vote.type === 'Delegating');

    return {
      id: transaction.id,
      chain,
      asset,
      transferable,

      balance: delegation ? delegation.data.balance.toString() : coreTxs[0].args.balance,
      conviction: delegation ? delegation.data.conviction : votingService.getConviction(coreTxs[0].args.conviction),
      delegate: delegation ? delegation.data.target : toAccountId(coreTxs[0].args.target),
      tracks: coreTxs.map((t: Transaction) => t.args.track),
      locks,

      initiator: account,
      signatory: account,
      route: [account],

      tx: transaction.coreTx,
      coreTx: transaction.coreTx,

      fee: fee.toString(),
      totalFee: '0',
      multisigDeposit: '0',
    } satisfies RevokeDelegationConfirm;
  },
);

const prepareVoteDataFx = createEffect(async ({ transaction, accounts, chains, apis }: DataParams) => {
  const coreTx = basketOperationsService.getCoreTx(transaction);

  const { chain, account } = await basketOperationsService.getTransactionData(
    transaction,
    apis,
    chains,
    accounts,
  );

  assert(chain, 'Chain not found');

  const api = apis[chain.chainId]!;

  return {
    id: transaction.id,
    api,
    chain,
    asset: getNativeAsset(chain.assets),
    initiator: account!,
    existingVote: coreTx.args.vote,
    signatory: account!,
    route: [account!],
    tx: transaction.coreTx,
    coreTx: transaction.coreTx,
  } satisfies VoteConfirm;
});

const prepareRemoveVoteDataFx = createEffect(async ({ transaction, accounts, chains, apis }: DataParams) => {
  const coreTxs = transaction.coreTx.args.transactions || [transaction.coreTx];

  const { chain, account } = await basketOperationsService.getTransactionData(
    transaction,
    apis,
    chains,
    accounts,
  );

  assert(chain, 'Chain not found');

  const api = apis[chain.chainId]!;

  return {
    api,
    chain,
    id: transaction.id,
    initiator: account!,
    asset: getNativeAsset(chain.assets),
    votes: coreTxs.map((t: Transaction) => t.args),
    signatory: account!,
    route: [account!],
    tx: transaction.coreTx,
    coreTx: transaction.coreTx,
  } satisfies RemoveVoteConfirm;
});

sample({
  clock: flow.open,
  source: {
    accounts: walletModel.$availableAccounts,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    connections: networkModel.$connections,
    balances: balanceModel.$balanceMap,
  },
  filter: (_, operation) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.VOTE;
  },
  fn: ({ accounts, chains, apis, connections, balances }, operation) => ({
    accounts,
    chains,
    apis,
    connections,
    transaction: operation,
    balances,
  }),
  target: prepareVoteDataFx,
});

sample({
  clock: prepareVoteDataFx.doneData,
  fn: (data) => [data],
  target: voteConfirmModel.init,
});

sample({
  clock: flow.open,
  source: {
    accounts: walletModel.$availableAccounts,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    connections: networkModel.$connections,
    balances: balanceModel.$balanceMap,
  },
  filter: (_, operation) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.REMOVE_VOTE;
  },
  fn: ({ accounts, chains, apis, connections, balances }, operation) => ({
    accounts,
    chains,
    apis,
    connections,
    transaction: operation,
    balances,
  }),
  target: prepareRemoveVoteDataFx,
});

sample({
  clock: prepareRemoveVoteDataFx.doneData,
  fn: (data) => [data],
  target: removeVoteConfirmModel.init,
});

sample({
  clock: flow.open,
  source: {
    accounts: walletModel.$availableAccounts,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    connections: networkModel.$connections,
    balances: balanceModel.$balanceMap,
  },
  filter: (_, operation) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.UNLOCK;
  },
  fn: ({ accounts, chains, apis, connections, balances }, operation) => ({
    accounts,
    chains,
    apis,
    connections,
    transaction: operation,
    balances,
  }),
  target: prepareUnlockDataFx,
});

sample({
  clock: prepareUnlockDataFx.doneData,
  fn: (data) => [data],
  target: unlockConfirmModel.init,
});

sample({
  clock: flow.open,
  source: {
    accounts: walletModel.$availableAccounts,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    connections: networkModel.$connections,
    balances: balanceModel.$balanceMap,
  },
  filter: (_, operation) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.DELEGATE;
  },
  fn: ({ accounts, chains, apis, connections, balances }, operation) => ({
    accounts,
    chains,
    apis,
    connections,
    transaction: operation,
    balances,
  }),
  target: prepareDelegateDataFx,
});

sample({
  clock: prepareDelegateDataFx.doneData,
  fn: (data) => [data],
  target: delegateConfirmModel.init,
});

sample({
  clock: flow.open,
  source: {
    accounts: walletModel.$availableAccounts,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    connections: networkModel.$connections,
    balances: balanceModel.$balanceMap,
  },
  filter: (_, operation) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.EDIT_DELEGATION;
  },
  fn: ({ accounts, chains, apis, connections, balances }, operation) => ({
    accounts,
    chains,
    apis,
    connections,
    transaction: operation,
    balances,
  }),
  target: prepareEditDelegationDataFx,
});

sample({
  clock: prepareEditDelegationDataFx.doneData,
  fn: (data) => [data],
  target: editDelegationConfirmModel.init,
});

sample({
  clock: flow.open,
  source: {
    accounts: walletModel.$availableAccounts,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    connections: networkModel.$connections,
    balances: balanceModel.$balanceMap,
  },
  filter: (_, operation) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.UNDELEGATE;
  },
  fn: ({ accounts, chains, apis, connections, balances }, operation) => ({
    accounts,
    chains,
    apis,
    connections,
    transaction: operation,
    balances,
  }),
  target: prepareRevokeDelegationDataFx,
});

sample({
  clock: prepareRevokeDelegationDataFx.doneData,
  fn: (data) => [data],
  target: revokeDelegationConfirmModel.init,
});

export const confirm = {
  flow,
};
