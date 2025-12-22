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
import { getNativeAsset, nonNullable, nullable } from '@/shared/lib/utils';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import { $collectiveStore, votingService } from '@/domains/collectives';
import { type Member, type Track } from '@/domains/collectives';
import { type AnyAccount } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { type BasketTransaction } from '@/aggregates/basket-operations';
import { basketOperationsService } from '@/aggregates/basket-operations';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';
import {
  type CollectiveEvidenceVoteConfirm,
  type CollectiveSalaryInductConfirm,
  type CollectiveSalaryPayoutConfirm,
  type CollectiveSalaryRequestConfirm,
  type CollectiveSubmitEvidenceConfirm,
  type CollectiveVoteConfirm,
  fellowshipEvidenceVotingConfirmModel,
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

const gate = createGate<BasketTransaction>();
const $fellowshipStore = $collectiveStore.map(store => store['fellowship'] || null);

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
  clock: gate.open,
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
  target: fellowshipVotingConfirmModel.replaceWithConfirm,
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
  clock: gate.open,
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
  target: fellowshipSalaryInductConfirmModel.replaceWithConfirm,
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
  clock: gate.open,
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
  target: fellowshipSalaryRequestConfirmModel.replaceWithConfirm,
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
  clock: gate.open,
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
  target: fellowshipSalaryPayoutConfirmModel.replaceWithConfirm,
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
  clock: gate.open,
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
  filter: nonNullable,
  target: fellowshipSubmitEvidenceConfirmModel.replaceWithConfirm,
});

// evidence vote

const prepareEvidenceVoteFx = createEffect<
  DataParams & {
    collectiveStore: Record<string, Record<string, { tracks?: Track[]; members?: Member[]; maxRank?: number }>>;
  },
  CollectiveEvidenceVoteConfirm | undefined
>(
  async ({
    transaction,
    wallets,
    accounts,
    chains,
    apis,
    collectiveStore,
  }: DataParams & {
    collectiveStore: Record<string, Record<string, { tracks?: Track[]; members?: Member[]; maxRank?: number }>>;
  }) => {
    const { chainId, chain, account, fee } = await basketOperationsService.getTransactionData(
      transaction,
      apis,
      chains,
      accounts,
    );

    const coreTx = basketOperationsService.getCoreTx(transaction);
    const api = apis[chainId];

    const fellowshipStore = collectiveStore?.['fellowship']?.[chainId];
    const tracks = fellowshipStore?.tracks ?? [];
    const members = fellowshipStore?.members ?? [];
    const maxRank = fellowshipStore?.maxRank ?? 0;

    const votingMember = members.find(m => m.accountId === account?.accountId);

    const proposalHex = coreTx.args.proposal;
    const struct = api.registry.createType('Proposal', proposalHex);
    const parsed =
      struct.method === 'promote' || struct.method === 'promoteFast' || struct.method === 'approve'
        ? pjsSchema.accountId.safeParse(struct.args.at(0))
        : null;
    const proposerAccountId = parsed?.success ? parsed.data : null;

    const proposerMember = proposerAccountId ? members.find(m => m.accountId === proposerAccountId) : null;

    if (nullable(votingMember) || nullable(proposerMember) || nullable(proposerAccountId)) {
      return;
    }

    const wish = String(coreTx.args.track).includes('Promote') ? 'Promotion' : 'Retention';

    const evidence: CollectiveEvidenceVoteConfirm['evidence'] = {
      pallet: 'fellowship',
      chainId: chain.chainId,
      wish,
      accountId: proposerMember.accountId,
      hash: coreTx.args.proposal,
    };

    return {
      id: transaction.id,
      initiator: account!,
      signatory: account!,
      chain,
      tx: transaction.coreTx,
      coreTx: transaction.coreTx,
      route: [],
      asset: getNativeAsset(chain.assets),
      wallets,
      fee: new BN(fee),
      aye: coreTx.args.aye,
      tracks,
      maxRank,
      votingMember: votingMember!,
      proposerMember: proposerMember!,
      evidence,
    } satisfies CollectiveEvidenceVoteConfirm;
  },
);

sample({
  clock: gate.open,
  source: {
    accounts: walletModel.$availableAccounts,
    wallets: walletModel.$wallets,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    connections: networkModel.$connections,
    balances: balanceModel.$balanceMap,
    collectiveStore: $collectiveStore,
  },
  filter: (_, operation) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return votingService.isEvidenceVotingTransaction(transaction);
  },
  fn: ({ wallets, accounts, chains, apis, connections, balances, collectiveStore }, operation) => ({
    wallets,
    accounts,
    chains,
    apis,
    connections,
    transaction: operation,
    balances,
    collectiveStore,
  }),
  target: prepareEvidenceVoteFx,
});

sample({
  clock: prepareEvidenceVoteFx.doneData,
  filter: nonNullable,
  target: fellowshipEvidenceVotingConfirmModel.replaceWithConfirm,
});

// setting up env

sample({
  clock: gate.open,
  fn(transaction) {
    return { chainId: transaction.coreTx.chainId };
  },
  target: fellowshipNetwork.selectCollective,
});

export const confirm = {
  gate,
  $fellowshipStore,
};
