import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { createEffect, sample } from 'effector';
import { createGate } from 'effector-react';

import {
  type Balance,
  type BasketTransaction,
  type Chain,
  type ChainId,
  type Connection,
  TransactionType,
  type Wallet,
} from '@/shared/core';
import { type AnyAccount } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { transactionService } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { basketOperationsService } from '@/aggregates/basket-operations';
import { type CollectiveVoteConfirm, fellowshipVotingConfirmModel } from '@/features/operations/OperationsConfirm';

type DataParams = {
  wallets: Wallet[];
  accounts: AnyAccount[];
  chains: Record<ChainId, Chain>;
  apis: Record<ChainId, ApiPromise>;
  transaction: BasketTransaction;
  connections: Record<ChainId, Connection>;
  balances: Balance[];
};

const flow = createGate<BasketTransaction>();

const prepareCollectiveVoteDataFx = createEffect(
  async ({ transaction, wallets, accounts, chains, apis }: DataParams) => {
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
  },
);

sample({
  clock: flow.open,
  source: {
    accounts: walletModel.$availableAccounts,
    wallets: walletModel.$wallets,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    connections: networkModel.$connections,
    balances: balanceModel.$balances,
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
  target: prepareCollectiveVoteDataFx,
});

sample({
  clock: prepareCollectiveVoteDataFx.doneData,
  fn: data => [data],
  target: fellowshipVotingConfirmModel.events.addConfirms,
});

export const confirm = {
  flow,
};
