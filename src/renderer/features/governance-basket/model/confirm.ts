import { type ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';
import { createEffect, sample } from 'effector';
import { createGate } from 'effector-react';

import {
  type Balance,
  type BasketTransaction,
  type Chain,
  type ChainId,
  type Connection,
  type Transaction,
  TransactionType,
} from '@/shared/core';
import { toAddress, transferableAmount } from '@/shared/lib/utils';
import { convictionVotingPallet } from '@/shared/pallet/convictionVoting';
import { type AnyAccount } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { governanceService, votingService } from '@/entities/governance';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { basketOperationsService } from '@/aggregates/basket-operations';
import { type UnlockFormData } from '@/features/governance/types/structs';
import {
  type RemoveVoteConfirm,
  type VoteConfirm,
  delegateConfirmModel,
  editDelegationConfirmModel,
  removeVoteConfirmModel,
  revokeDelegationConfirmModel,
  voteConfirmModel,
} from '@/features/operations/OperationsConfirm';
import { type RevokeDelegationConfirm } from '@/features/operations/OperationsConfirm/RevokeDelegation/model/confirm-model';
import { unlockConfirmAggregate } from '@/widgets/UnlockModal';
import { type DelegateInput } from '../types/confirm';

type DataParams = {
  accounts: AnyAccount[];
  chains: Record<ChainId, Chain>;
  apis: Record<ChainId, ApiPromise>;
  transaction: BasketTransaction;
  connections: Record<ChainId, Connection>;
  balances: Balance[];
};

const flow = createGate<BasketTransaction>();

const prepareUnlockDataFx = createEffect(async ({ transaction, accounts, chains, apis }: DataParams) => {
  const { chainId, chain, account, fee } = await basketOperationsService.getTransactionData(
    transaction,
    apis,
    chains,
    accounts,
  );

  const coreTx = basketOperationsService.getCoreTx(transaction);

  const totalLock = await governanceService
    .getTrackLocks(apis[chainId], [transaction.coreTx.accountId])
    .then((data) => {
      const lock = data[transaction.coreTx.accountId];

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
});

const prepareDelegateDataFx = createEffect(async ({ transaction, accounts, chains, apis, balances }: DataParams) => {
  const { chainId, chain, account, fee } = await basketOperationsService.getTransactionData(
    transaction,
    apis,
    chains,
    accounts,
  );
  const asset = chain.assets[0];

  const transferable = transferableAmount(
    balanceUtils.getBalance(balances, account!.accountId, chainId, asset.assetId.toString()),
  );

  const locks = await governanceService.getTrackLocks(apis[chainId], [transaction.coreTx.accountId]).then((data) => {
    const lock = data[transaction.coreTx.accountId];

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
    signatory: null,

    fee,
    totalFee: '0',
    multisigDeposit: '0',
  } satisfies DelegateInput;
});

const prepareEditDelegationDataFx = createEffect(
  async ({ transaction, accounts, chains, apis, balances }: DataParams) => {
    const { chainId, chain, account, fee } = await basketOperationsService.getTransactionData(
      transaction,
      apis,
      chains,
      accounts,
    );
    const asset = chain.assets[0];

    const transferable = transferableAmount(
      balanceUtils.getBalance(balances, account!.accountId, chainId, asset.assetId.toString()),
    );

    const locks = await governanceService.getTrackLocks(apis[chainId], [transaction.coreTx.accountId]).then((data) => {
      const lock = data[transaction.coreTx.accountId];

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
      conviction: coreTxs[0].args.conviction,
      // TODO: Previous conviction should be received from chain
      previousConviction: coreTxs[0].args.previousConviction || 'None',
      target: coreTxs[0].args.target,
      tracks: coreTxs.map((t: Transaction) => t.args.track),
      description: '',
      locks,
      signatory: null,

      fee,
      totalFee: '0',
      multisigDeposit: '0',
    } satisfies DelegateInput;
  },
);

const prepareRevokeDelegationDataFx = createEffect(
  async ({ transaction, accounts, chains, apis, balances }: DataParams) => {
    const { chainId, chain, account, fee } = await basketOperationsService.getTransactionData(
      transaction,
      apis,
      chains,
      accounts,
    );

    assert(account, 'Signing account not found');

    const asset = chain.assets[0];

    const transferable = transferableAmount(
      balanceUtils.getBalance(balances, account!.accountId, chainId, asset.assetId.toString()),
    );
    const locks = await governanceService.getTrackLocks(apis[chainId], [transaction.coreTx.accountId]).then((data) => {
      const lock = data[transaction.coreTx.accountId];

      return Object.values(lock).reduce<BN>((acc, lock) => BN.max(lock, acc), BN_ZERO);
    });

    const coreTxs = transaction.coreTx.args.transactions || [transaction.coreTx];

    const votes = await convictionVotingPallet.storage.votingFor(apis[chainId], [
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
      delegate: delegation
        ? toAddress(delegation.data.target, { prefix: chain.addressPrefix })
        : coreTxs[0].args.target,
      tracks: coreTxs.map((t: Transaction) => t.args.track),
      locks,

      initiator: account,
      signatory: account,
      route: [account],

      tx: transaction.coreTx,
      coreTx: transaction.coreTx,
      multisigTx: null,

      fee,
      totalFee: '0',
      multisigDeposit: '0',
    } satisfies RevokeDelegationConfirm;
  },
);

const prepareVoteDataFx = createEffect(async ({ transaction, accounts, chains, apis }: DataParams) => {
  const coreTx = basketOperationsService.getCoreTx(transaction);

  const { chainId, chain, account } = await basketOperationsService.getTransactionData(
    transaction,
    apis,
    chains,
    accounts,
  );

  const api = apis[chainId];

  return {
    id: transaction.id,
    api,
    chain,
    asset: chain.assets[0],
    initiator: account!,
    existingVote: coreTx.args.vote,
    signatory: account!,
    multisigTx: null,
    route: [account!],
    tx: transaction.coreTx,
    coreTx: transaction.coreTx,
  } satisfies VoteConfirm;
});

const prepareRemoveVoteDataFx = createEffect(async ({ transaction, accounts, chains, apis }: DataParams) => {
  const coreTxs = transaction.coreTx.args.transactions || [transaction.coreTx];

  const { chainId, chain, account } = await basketOperationsService.getTransactionData(
    transaction,
    apis,
    chains,
    accounts,
  );

  const api = apis[chainId];

  return {
    api,
    chain,
    id: transaction.id,
    initiator: account!,
    asset: chain.assets[0],
    votes: coreTxs.map((t: Transaction) => t.args),
    signatory: account!,
    multisigTx: null,
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
    balances: balanceModel.$balances,
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
    balances: balanceModel.$balances,
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
    balances: balanceModel.$balances,
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
  target: unlockConfirmAggregate.events.formInitiated,
});

sample({
  clock: flow.open,
  source: {
    accounts: walletModel.$availableAccounts,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    connections: networkModel.$connections,
    balances: balanceModel.$balances,
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
  target: delegateConfirmModel.events.formInitiated,
});

sample({
  clock: flow.open,
  source: {
    accounts: walletModel.$availableAccounts,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    connections: networkModel.$connections,
    balances: balanceModel.$balances,
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
  target: editDelegationConfirmModel.events.formInitiated,
});

sample({
  clock: flow.open,
  source: {
    accounts: walletModel.$availableAccounts,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    connections: networkModel.$connections,
    balances: balanceModel.$balances,
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
