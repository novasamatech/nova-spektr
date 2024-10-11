import { type ApiPromise } from '@polkadot/api';
import { type SignerOptions } from '@polkadot/api/submittable/types';
import { BN, BN_ZERO } from '@polkadot/util';
import { createEffect, createEvent, sample } from 'effector';

import { convictionVotingPallet } from '@/shared/pallet/convictionVoting';
import { type Asset, type Balance, type Chain, type ID, type Transaction } from '@shared/core';
import { toAccountId, transferableAmount } from '@shared/lib/utils';
import { balanceModel, balanceUtils } from '@entities/balance';
import { votingService } from '@entities/governance';
import { networkModel } from '@entities/network';
import { transactionService } from '@entities/transaction';
import {
  type AmountFeeStore,
  type Validation,
  type ValidationStartedParams,
  validationUtils,
} from '@/features/operations/OperationsValidation';

const validationStarted = createEvent<ValidationStartedParams>();

type ValidateParams = {
  id: ID;
  api: ApiPromise;
  chain: Chain;
  asset: Asset;
  transaction: Transaction;
  balances: Balance[];
  signerOptions?: Partial<SignerOptions>;
};

const validateFx = createEffect(
  async ({ id, api, chain, asset, transaction, balances, signerOptions }: ValidateParams) => {
    const accountId = toAccountId(transaction.address);
    const fee = await transactionService.getTransactionFee(transaction, api, signerOptions);

    const votes = await convictionVotingPallet.storage.votingFor(api, [[transaction.address, transaction.args.track]]);
    const voting = votes.find((vote) => vote.type === 'Casting');
    const isVoteExist = voting?.data.votes.find((vote) => vote.referendum === +transaction.args.referendum);

    const shardBalance = balanceUtils.getBalance(balances, accountId, chain.chainId, asset.assetId.toString());

    const rules: Validation<BN, { shards: unknown[] }>[] = [
      {
        name: 'insufficientBalanceForFee',
        errorText: 'transfer.notEnoughBalanceForFeeError',
        value: BN_ZERO,
        form: { shards: [{ accountId }] },
        source: {
          isMultisig: false,
          network: { chain, asset },
          feeData: { fee },
          accountsBalances: [transferableAmount(shardBalance)],
        },
        validator: (_v, form, { feeData, isMultisig, accountsBalances }: AmountFeeStore) => {
          if (isMultisig) return true;

          const feeBN = new BN(feeData.fee);

          return form.shards.every((_, index: number) => {
            return feeBN.lte(new BN(accountsBalances[index]));
          });
        },
      },
      {
        name: 'noVoteForReferendum',
        errorText: 'governance.referendums.vote.noVoteForReferendum',
        value: BN_ZERO,
        form: { shards: [{ accountId }] },
        source: isVoteExist,
        validator: (_v, _f, isVoteExist: boolean) => {
          return isVoteExist;
        },
      },
    ];

    return { id, result: validationUtils.applyValidationRules(rules) };
  },
);

sample({
  clock: validationStarted,
  source: {
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    balances: balanceModel.$balances,
  },
  filter: ({ apis }, { transaction }) => transaction.chainId in apis,
  fn: ({ apis, chains, balances }, { id, transaction, signerOptions }) => {
    const chain = chains[transaction.chainId];
    const api = apis[transaction.chainId];
    const asset = votingService.getVotingAsset(chain);

    return {
      id,
      api,
      transaction,
      chain,
      asset: asset!,
      balances,
      signerOptions,
    };
  },
  target: validateFx,
});

export const removeVoteValidateModel = {
  events: {
    validationStarted,
  },
  output: {
    txValidated: validateFx.doneData,
  },
};
