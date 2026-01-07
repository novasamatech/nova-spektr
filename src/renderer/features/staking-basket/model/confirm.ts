import { type ApiPromise } from '@polkadot/api';
import { createEffect, sample } from 'effector';
import { createGate } from 'effector-react';

import { type Chain, type ChainId, type Connection, type Transaction, TransactionType } from '@/shared/core';
import { redeemableAmount, toAccountId } from '@/shared/lib/utils';
import { type AnyAccount } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { type StakingMap, eraService, stakingUtils, validatorsService } from '@/entities/staking';
import { walletModel } from '@/entities/wallet';
import { type BasketTransaction, basketOperationsService } from '@/aggregates/basket-operations';
import {
  type BondExtraConfirm,
  type PayeeConfirm,
  bondExtraConfirmModel,
  bondNominateConfirmModel,
  nominateConfirmModel,
  payeeConfirmModel,
  restakeConfirmModel,
  unstakeConfirmModel,
  withdrawConfirmModel,
} from '@/features/operations/OperationsConfirm';
import { type BondNominateConfirm } from '@/features/operations/OperationsConfirm/BondNominate/model/confirm-model';
import { type NominateConfirm } from '@/features/operations/OperationsConfirm/Nominate/model/confirm-model';
import { type RestakeConfirm } from '@/features/operations/OperationsConfirm/Restake/model/confirm-model';
import { type UnstakeConfirm } from '@/features/operations/OperationsConfirm/Unstake/model/confirm-model';
import { type WithdrawConfirm } from '@/features/operations/OperationsConfirm/Withdraw/model/confirm-model';

type DataParams = {
  accounts: AnyAccount[];
  chains: Record<ChainId, Chain>;
  apis: Record<ChainId, ApiPromise>;
  transaction: BasketTransaction;
  connections: Record<ChainId, Connection>;
};

const flow = createGate<BasketTransaction>();

const prepareBondNominateDataFx = createEffect(async ({ transaction, accounts, chains, apis }: DataParams) => {
  const bondTx = transaction.coreTx.args.transactions.find((t: Transaction) => t.type === TransactionType.BOND)!;
  const nominateTx = transaction.coreTx.args.transactions.find(
    (t: Transaction) => t.type === TransactionType.NOMINATE,
  )!;

  const { chainId, chain, account, fee } = await basketOperationsService.getTransactionData(
    transaction,
    apis,
    chains,
    accounts,
  );

  const era = await eraService.getActiveEra(apis[chainId]);
  const validatorsMap = await validatorsService.getValidatorsWithInfo(apis[chainId], era || 0);

  const validators = nominateTx.args.targets.map((address: string) => validatorsMap[toAccountId(address)]);

  return {
    id: transaction.id,
    chain,
    asset: chain.assets[0]!,
    amount: bondTx.args.value,
    validators,
    destination: bondTx.args.dest,
    signatory: account!,
    initiator: account!,
    route: transaction.route,
    coreTx: transaction.coreTx,
    tx: transaction.coreTx,
    fee: fee.toString(),
    totalFee: fee.toString(),
    multisigDeposit: '0',
  } satisfies BondNominateConfirm;
});

const prepareBondExtraDataFx = createEffect(async ({ transaction, accounts, chains, apis }: DataParams) => {
  const { chain, account, fee } = await basketOperationsService.getTransactionData(transaction, apis, chains, accounts);

  return {
    id: transaction.id,
    chain,
    asset: chain.assets[0]!,
    amount: transaction.coreTx.args.maxAdditional,
    signatory: account!,
    fee: fee.toString(),
    totalFee: fee.toString(),
    multisigDeposit: '0',
    initiator: account!,
    route: transaction.route,
    tx: transaction.coreTx,
    coreTx: transaction.coreTx,
  } satisfies BondExtraConfirm;
});

const prepareNominateDataFx = createEffect(async ({ transaction, accounts, chains, apis }: DataParams) => {
  const { chainId, chain, account, fee } = await basketOperationsService.getTransactionData(
    transaction,
    apis,
    chains,
    accounts,
  );

  const era = await eraService.getActiveEra(apis[chainId]);
  const validatorsMap = await validatorsService.getValidatorsWithInfo(apis[chainId], era || 0);

  const validators = transaction.coreTx.args.targets.map((address: string) => validatorsMap[toAccountId(address)]);

  return {
    id: transaction.id,
    chain,
    asset: chain.assets[0]!,
    initiator: account!,
    signatory: account!,
    validators,
    route: [account!],

    fee: fee.toString(),
    totalFee: fee.toString(),
    multisigDeposit: '0',
    tx: transaction.coreTx,
    coreTx: transaction.coreTx,
  } satisfies NominateConfirm;
});

const preparePayeeDataFx = createEffect(async ({ transaction, accounts, chains, apis }: DataParams) => {
  const { chain, account, fee } = await basketOperationsService.getTransactionData(transaction, apis, chains, accounts);

  return {
    id: transaction.id,
    chain,
    asset: chain.assets[0]!,
    destination: transaction.coreTx.args.dest,
    initiator: account!,
    signatory: account!,

    coreTx: transaction.coreTx,
    tx: transaction.coreTx,
    route: transaction.route,

    fee: fee.toString(),
    totalFee: fee.toString(),
    multisigDeposit: '0',
  } satisfies PayeeConfirm;
});

const prepareUnstakeDataFx = createEffect(async ({ transaction, accounts, chains, apis }: DataParams) => {
  const { chain, account, fee } = await basketOperationsService.getTransactionData(transaction, apis, chains, accounts);

  const coreTx = basketOperationsService.getCoreTx(transaction);

  return {
    id: transaction.id,
    chain,
    asset: chain.assets[0]!,
    amount: coreTx.args.value,
    api: apis[chain.chainId],
    signatory: account!,
    initiator: account!,
    route: transaction.route,
    coreTx: transaction.coreTx,
    tx: transaction.coreTx,

    fee: fee.toString(),
    totalFee: fee.toString(),
    multisigDeposit: '0',
  } satisfies UnstakeConfirm;
});

const prepareRestakeDataFx = createEffect(async ({ transaction, accounts, chains, apis }: DataParams) => {
  const { chain, account, fee } = await basketOperationsService.getTransactionData(transaction, apis, chains, accounts);

  return {
    id: transaction.id,
    chain,
    asset: chain.assets[0]!,
    amount: transaction.coreTx.args.value,
    signatory: account!,
    initiator: account!,
    route: transaction.route,
    coreTx: transaction.coreTx,
    tx: transaction.coreTx,
    fee: fee.toString(),
    totalFee: '0',
    multisigDeposit: '0',
  } satisfies RestakeConfirm;
});

const prepareWithdrawDataFx = createEffect(async ({ transaction, accounts, chains, apis }: DataParams) => {
  const { chainId, chain, account, fee } = await basketOperationsService.getTransactionData(
    transaction,
    apis,
    chains,
    accounts,
  );
  const era = await eraService.getActiveEra(apis[chainId]);

  const staking = await new Promise<StakingMap>((resolve) => {
    stakingUtils.subscribeStaking(chainId, apis[chainId], [transaction.coreTx.accountId], resolve);
  });

  const amount = redeemableAmount(staking?.[transaction.coreTx.accountId]?.unlocking, era || 0);

  return {
    id: transaction.id,
    chain,
    asset: chain.assets[0]!,
    signatory: account!,
    initiator: account!,
    amount,
    route: transaction.route,
    coreTx: transaction.coreTx,
    tx: transaction.coreTx,
    fee: fee.toString(),
    totalFee: '0',
    multisigDeposit: '0',
  } satisfies WithdrawConfirm;
});

sample({
  clock: flow.open,
  source: {
    accounts: walletModel.$availableAccounts,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    connections: networkModel.$connections,
  },
  filter: (_, operation) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.REDEEM;
  },
  fn: ({ accounts, chains, apis, connections }, operation) => ({
    accounts,
    chains,
    apis,
    connections,
    transaction: operation,
  }),
  target: prepareWithdrawDataFx,
});

sample({
  clock: prepareWithdrawDataFx.doneData,
  fn: (data) => [data],
  target: withdrawConfirmModel.init,
});

sample({
  clock: flow.open,
  source: {
    accounts: walletModel.$availableAccounts,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    connections: networkModel.$connections,
  },
  filter: (_, operation) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.BOND;
  },
  fn: ({ accounts, chains, apis, connections }, operation) => ({
    accounts,
    chains,
    apis,
    connections,
    transaction: operation,
  }),
  target: prepareBondNominateDataFx,
});

sample({
  clock: prepareBondNominateDataFx.doneData,
  fn: (data) => [data],
  target: bondNominateConfirmModel.init,
});

sample({
  clock: flow.open,
  source: {
    accounts: walletModel.$availableAccounts,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    connections: networkModel.$connections,
  },
  filter: (_, operation) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.STAKE_MORE;
  },
  fn: ({ accounts, chains, apis, connections }, operation) => ({
    accounts,
    chains,
    apis,
    connections,
    transaction: operation,
  }),
  target: prepareBondExtraDataFx,
});

sample({
  clock: prepareBondExtraDataFx.doneData,
  fn: (data) => [data],
  target: bondExtraConfirmModel.init,
});

sample({
  clock: flow.open,
  source: {
    accounts: walletModel.$availableAccounts,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    connections: networkModel.$connections,
  },
  filter: (_, operation) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.UNSTAKE;
  },
  fn: ({ accounts, chains, apis, connections }, operation) => ({
    accounts,
    chains,
    apis,
    connections,
    transaction: operation,
  }),
  target: prepareUnstakeDataFx,
});

sample({
  clock: prepareUnstakeDataFx.doneData,
  fn: (data) => [data],
  target: unstakeConfirmModel.formInitiated,
});

sample({
  clock: flow.open,
  source: {
    accounts: walletModel.$availableAccounts,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    connections: networkModel.$connections,
  },
  filter: (_, operation) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.RESTAKE;
  },
  fn: ({ accounts, chains, apis, connections }, operation) => ({
    accounts,
    chains,
    apis,
    connections,
    transaction: operation,
  }),
  target: prepareRestakeDataFx,
});

sample({
  clock: prepareRestakeDataFx.doneData,
  fn: (data) => [data],
  target: restakeConfirmModel.init,
});

sample({
  clock: flow.open,
  source: {
    accounts: walletModel.$availableAccounts,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    connections: networkModel.$connections,
  },
  filter: (_, operation) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.NOMINATE;
  },
  fn: ({ accounts, chains, apis, connections }, operation) => ({
    accounts,
    chains,
    apis,
    connections,
    transaction: operation,
  }),
  target: prepareNominateDataFx,
});

sample({
  clock: prepareNominateDataFx.doneData,
  fn: (data) => [data],
  target: nominateConfirmModel.startSigning,
});

sample({
  clock: flow.open,
  source: {
    accounts: walletModel.$availableAccounts,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    connections: networkModel.$connections,
  },
  filter: (_, operation) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.DESTINATION;
  },
  fn: ({ accounts, chains, apis, connections }, operation) => ({
    accounts,
    chains,
    apis,
    connections,
    transaction: operation,
  }),
  target: preparePayeeDataFx,
});

sample({
  clock: preparePayeeDataFx.doneData,
  fn: (data) => [data],
  target: payeeConfirmModel.init,
});

export const confirm = {
  flow,
};
