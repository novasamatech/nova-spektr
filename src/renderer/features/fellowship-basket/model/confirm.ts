import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { createEffect, sample } from 'effector';
import { createGate } from 'effector-react';

import {
  type BalanceMap,
  type Chain,
  type ChainId,
  type Connection,
  TransactionType,
  type Wallet,
} from '@/shared/core';
import { getNativeAsset, nonNullable } from '@/shared/lib/utils';
import { type AnyAccount } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { type BasketTransaction } from '@/aggregates/basket-operations';
import { basketOperationsService } from '@/aggregates/basket-operations';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';
import {
  type CollectiveSalaryInductConfirm,
  type CollectiveSalaryPayoutConfirm,
  type CollectiveSalaryRequestConfirm,
  type CollectiveSubmitEvidenceConfirm,
  type CollectiveVoteConfirm,
  fellowshipSalaryInductConfirmModel,
  fellowshipSalaryPayoutConfirmModel,
  fellowshipSalaryRequestConfirmModel,
  fellowshipSubmitEvidenceConfirmModel,
  fellowshipVotingConfirmModel,
} from '@/features/operations/OperationsConfirm';

type DataParams = {
  wallets: Wallet[];
  accounts: AnyAccount[];
  chains: Record<ChainId, Chain>;
  apis: Record<ChainId, ApiPromise>;
  transaction: BasketTransaction;
  connections: Record<ChainId, Connection>;
  balances: BalanceMap;
};

const flow = createGate<BasketTransaction>();

// vote

const prepareVoteFx = createEffect(async ({ transaction, wallets, accounts, chains, apis }: DataParams) => {
  const { chainId, chain, account, fee } = await basketOperationsService.getTransactionData(
    transaction,
    apis,
    chains,
    accounts,
  );

  const coreTx = basketOperationsService.getCoreTx(transaction);
  const api = apis[chainId];

  return {
    api,
    chain,
    wallets,
    id: transaction.id,
    asset: getNativeAsset(chain.assets),
    initiator: account!,
    signatory: account!,
    pallet: coreTx.args.pallet as CollectiveVoteConfirm['pallet'],
    aye: coreTx.args.aye,
    poll: coreTx.args.poll,
    rank: coreTx.args.rank,
    fee: new BN(fee),
    coreTx: transaction.coreTx,
    tx: transaction.coreTx,
    route: [],
  } satisfies CollectiveVoteConfirm;
});

sample({
  clock: flow.open,
  source: {
    accounts: walletModel.$availableAccounts,
    wallets: walletModel.$wallets,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    connections: networkModel.$connections,
    balances: balanceModel.$balanceMap,
  },
  filter: (_, operation) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.COLLECTIVE_VOTE;
  },
  fn: ({ wallets, accounts, chains, apis, connections, balances }, operation) => ({
    wallets,
    accounts,
    chains,
    apis,
    connections,
    transaction: operation,
    balances,
  }),
  target: prepareVoteFx,
});

sample({
  clock: prepareVoteFx.doneData,
  filter: nonNullable,
  fn: data => [data],
  target: fellowshipVotingConfirmModel.init,
});

// salary induct

const prepareSalaryInductFx = createEffect(async ({ transaction, wallets, accounts, chains, apis }: DataParams) => {
  const { chainId, chain, account, fee } = await basketOperationsService.getTransactionData(
    transaction,
    apis,
    chains,
    accounts,
  );

  const coreTx = basketOperationsService.getCoreTx(transaction);
  const api = apis[chainId];

  return {
    api,
    chain,
    wallets,
    id: transaction.id,
    asset: getNativeAsset(chain.assets),
    initiator: account!,
    signatory: account!,
    pallet: coreTx.args.pallet as CollectiveVoteConfirm['pallet'],
    fee: new BN(fee),
    coreTx: transaction.coreTx,
    tx: transaction.coreTx,
    route: [],
  } satisfies CollectiveSalaryInductConfirm;
});

sample({
  clock: flow.open,
  source: {
    accounts: walletModel.$availableAccounts,
    wallets: walletModel.$wallets,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    connections: networkModel.$connections,
    balances: balanceModel.$balanceMap,
  },
  filter: (_, operation) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.COLLECTIVE_SALARY_INDUCT;
  },
  fn: ({ wallets, accounts, chains, apis, connections, balances }, operation) => ({
    wallets,
    accounts,
    chains,
    apis,
    connections,
    transaction: operation,
    balances,
  }),
  target: prepareSalaryInductFx,
});

sample({
  clock: prepareSalaryInductFx.doneData,
  filter: nonNullable,
  fn: data => [data],
  target: fellowshipSalaryInductConfirmModel.init,
});

// salary request

const prepareSalaryRequestFx = createEffect(async ({ transaction, wallets, accounts, chains, apis }: DataParams) => {
  const { chainId, chain, account, fee } = await basketOperationsService.getTransactionData(
    transaction,
    apis,
    chains,
    accounts,
  );

  const coreTx = basketOperationsService.getCoreTx(transaction);
  const api = apis[chainId];

  return {
    api,
    chain,
    wallets,
    id: transaction.id,
    asset: getNativeAsset(chain.assets),
    initiator: account!,
    signatory: account!,
    coreTx: transaction.coreTx,
    tx: transaction.coreTx,
    route: [],
    pallet: coreTx.args.pallet as CollectiveVoteConfirm['pallet'],
    fee: new BN(fee),
  } satisfies CollectiveSalaryRequestConfirm;
});

sample({
  clock: flow.open,
  source: {
    accounts: walletModel.$availableAccounts,
    wallets: walletModel.$wallets,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    connections: networkModel.$connections,
    balances: balanceModel.$balanceMap,
  },
  filter: (_, operation) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.COLLECTIVE_SALARY_REQUEST;
  },
  fn: ({ wallets, accounts, chains, apis, connections, balances }, operation) => ({
    wallets,
    accounts,
    chains,
    apis,
    connections,
    transaction: operation,
    balances,
  }),
  target: prepareSalaryRequestFx,
});

sample({
  clock: prepareSalaryRequestFx.doneData,
  filter: nonNullable,
  fn: data => [data],
  target: fellowshipSalaryRequestConfirmModel.init,
});

// salary payout

const prepareSalaryPayoutFx = createEffect(async ({ transaction, wallets, accounts, chains, apis }: DataParams) => {
  const { chainId, chain, account, fee } = await basketOperationsService.getTransactionData(
    transaction,
    apis,
    chains,
    accounts,
  );

  const coreTx = basketOperationsService.getCoreTx(transaction);
  const api = apis[chainId];

  return {
    api,
    chain,
    wallets,
    id: transaction.id,
    asset: getNativeAsset(chain.assets),
    initiator: account!,
    signatory: account!,
    coreTx: transaction.coreTx,
    tx: transaction.coreTx,
    route: [],
    pallet: coreTx.args.pallet as CollectiveVoteConfirm['pallet'],
    fee: new BN(fee),
    beneficiary: coreTx.args.beneficiary,
  } satisfies CollectiveSalaryPayoutConfirm;
});

sample({
  clock: flow.open,
  source: {
    accounts: walletModel.$availableAccounts,
    wallets: walletModel.$wallets,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    connections: networkModel.$connections,
    balances: balanceModel.$balanceMap,
  },
  filter: (_, operation) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.COLLECTIVE_SALARY_PAYOUT;
  },
  fn: ({ wallets, accounts, chains, apis, connections, balances }, operation) => ({
    wallets,
    accounts,
    chains,
    apis,
    connections,
    transaction: operation,
    balances,
  }),
  target: prepareSalaryPayoutFx,
});

sample({
  clock: prepareSalaryPayoutFx.doneData,
  filter: nonNullable,
  fn: data => [data],
  target: fellowshipSalaryPayoutConfirmModel.init,
});

// evidence

const prepareEvidencePayoutFx = createEffect(async ({ transaction, wallets, accounts, chains, apis }: DataParams) => {
  const { chainId, chain, account, fee } = await basketOperationsService.getTransactionData(
    transaction,
    apis,
    chains,
    accounts,
  );

  const coreTx = basketOperationsService.getCoreTx(transaction);
  const api = apis[chainId];

  return {
    api,
    chain,
    wallets,
    id: transaction.id,
    asset: getNativeAsset(chain.assets),
    initiator: account!,
    signatory: account!,
    coreTx: transaction.coreTx,
    tx: transaction.coreTx,
    route: [],
    pallet: coreTx.args.pallet as CollectiveVoteConfirm['pallet'],
    fee: new BN(fee),
    wish: coreTx.args.wish,
    evidence: coreTx.args.evidence,
  } satisfies CollectiveSubmitEvidenceConfirm;
});

sample({
  clock: flow.open,
  source: {
    accounts: walletModel.$availableAccounts,
    wallets: walletModel.$wallets,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    connections: networkModel.$connections,
    balances: balanceModel.$balanceMap,
  },
  filter: (_, operation) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.COLLECTIVE_SUBMIT_EVIDENCE;
  },
  fn: ({ wallets, accounts, chains, apis, connections, balances }, operation) => ({
    wallets,
    accounts,
    chains,
    apis,
    connections,
    transaction: operation,
    balances,
  }),
  target: prepareEvidencePayoutFx,
});

sample({
  clock: prepareEvidencePayoutFx.doneData,
  fn: data => [data],
  target: fellowshipSubmitEvidenceConfirmModel.init,
});

// setting up env

sample({
  clock: flow.open,
  fn(transaction) {
    return { chainId: transaction.coreTx.chainId };
  },
  target: fellowshipNetwork.selectCollective,
});

export const confirm = {
  flow,
};
