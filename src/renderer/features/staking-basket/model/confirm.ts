import { type ApiPromise } from '@polkadot/api';
import { createEffect, sample } from 'effector';
import { createGate } from 'effector-react';

import {
  type BasketTransaction,
  type Chain,
  type ChainId,
  type Connection,
  type Transaction,
  TransactionType,
  WrapperKind,
} from '@/shared/core';
import { redeemableAmount, toAddress } from '@/shared/lib/utils';
import { type AnyAccount } from '@/domains/network';
import { networkModel, networkUtils } from '@/entities/network';
import { eraService, useStakingData, validatorsService } from '@/entities/staking';
import { walletModel } from '@/entities/wallet';
import { basketOperationsService } from '@/aggregates/basket-operations';
import {
  type BondExtraConfirm,
  bondExtraConfirmModel,
  bondNominateConfirmModel,
  nominateConfirmModel,
  payeeConfirmModel,
  restakeConfirmModel,
  unstakeConfirmModel,
  withdrawConfirmModel,
} from '@/features/operations/OperationsConfirm';
import { type RestakeConfirm } from '@/features/operations/OperationsConfirm/Restake/model/confirm-model';
import { type WithdrawConfirm } from '@/features/operations/OperationsConfirm/Withdraw/model/confirm-model';
import { type BondNominateInput, type NominateInput, type PayeeInput, type UnstakeInput } from '../types/confirm';

type DataParams = {
  accounts: AnyAccount[];
  chains: Record<ChainId, Chain>;
  apis: Record<ChainId, ApiPromise>;
  transaction: BasketTransaction;
  connections: Record<ChainId, Connection>;
};

const flow = createGate<BasketTransaction>();

const prepareBondNominateDataFx = createEffect(
  async ({ transaction, accounts, connections, chains, apis }: DataParams) => {
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
      signatory: null,

      fee,
      multisigDeposit: '0',
    } as BondNominateInput;
  },
);

const prepareBondExtraDataFx = createEffect(async ({ transaction, accounts, chains, apis }: DataParams) => {
  const { chain, account, fee } = await basketOperationsService.getTransactionData(transaction, apis, chains, accounts);

  return {
    id: transaction.id,
    chain,
    asset: chain.assets[0],
    amount: transaction.coreTx.args.maxAdditional,
    signatory: account!,
    fee,
    totalFee: fee.toString(),
    multisigDeposit: '0',
    initiator: account!,
    route: transaction.txWrappers.map((wrapper) =>
      wrapper.kind === WrapperKind.PROXY ? wrapper.proxyAccount : wrapper.signer,
    ),
    tx: transaction.coreTx,
    coreTx: transaction.coreTx,
    multisigTx: transaction.coreTx,
  } satisfies BondExtraConfirm;
});

const prepareNominateDataFx = createEffect(async ({ transaction, accounts, chains, apis, connections }: DataParams) => {
  const { chainId, chain, account, fee } = await basketOperationsService.getTransactionData(
    transaction,
    apis,
    chains,
    accounts,
  );

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
    signatory: null,

    fee,
    totalFee: '0',
    multisigDeposit: '0',
  } as NominateInput;
});

const preparePayeeDataFx = createEffect(async ({ transaction, accounts, chains, apis }: DataParams) => {
  const { chain, account, fee } = await basketOperationsService.getTransactionData(transaction, apis, chains, accounts);

  return {
    id: transaction.id,
    chain,
    asset: chain.assets[0],
    shards: [account],
    destination: transaction.coreTx.args.dest,
    description: '',
    signatory: null,

    fee,
  } as PayeeInput;
});

const prepareUnstakeDataFx = createEffect(async ({ transaction, accounts, chains, apis }: DataParams) => {
  const { chain, account, fee } = await basketOperationsService.getTransactionData(transaction, apis, chains, accounts);

  const coreTx = basketOperationsService.getCoreTx(transaction);

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
});

const prepareRestakeDataFx = createEffect(async ({ transaction, accounts, chains, apis }: DataParams) => {
  const { chain, account, fee } = await basketOperationsService.getTransactionData(transaction, apis, chains, accounts);

  return {
    id: transaction.id,
    chain,
    asset: chain.assets[0],
    amount: transaction.coreTx.args.value,
    signatory: account!,
    initiator: account!,
    route: transaction.txWrappers.map((wrapper) =>
      wrapper.kind === WrapperKind.PROXY ? wrapper.proxyAccount : wrapper.multisigAccount,
    ),
    coreTx: transaction.coreTx,
    tx: transaction.coreTx,
    multisigTx: null,
    fee,
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
  const address = toAddress(transaction.coreTx.accountId, { prefix: chain.addressPrefix });

  const staking = (await new Promise((resolve) => {
    useStakingData().subscribeStaking(chainId, apis[chainId], [address], resolve);
  })) as any;

  const amount = redeemableAmount(staking?.[address]?.unlocking, era || 0);

  return {
    id: transaction.id,
    chain,
    asset: chain.assets[0],
    signatory: account!,
    initiator: account!,
    amount,
    route: transaction.txWrappers.map((wrapper) =>
      wrapper.kind === WrapperKind.PROXY ? wrapper.proxyAccount : wrapper.multisigAccount,
    ),
    coreTx: transaction.coreTx,
    tx: transaction.coreTx,
    multisigTx: null,
    fee,
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
  target: bondNominateConfirmModel.events.formInitiated,
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
  target: unstakeConfirmModel.events.formInitiated,
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
  target: nominateConfirmModel.events.formInitiated,
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
  target: payeeConfirmModel.events.formInitiated,
});

export const confirm = {
  flow,
};
