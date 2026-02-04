import { type ApiPromise } from '@polkadot/api';
import { type SignerOptions } from '@polkadot/api/submittable/types';
import { BN, BN_ZERO } from '@polkadot/util';
import { attach, createEffect } from 'effector';
import { t } from 'i18next';

import { type Asset, type BalanceMap, type Chain, type ID, type Transaction } from '@/shared/core';
import { getAssetById, transferableAmount } from '@/shared/lib/utils';
import { convictionVotingPallet } from '@/shared/pallet/convictionVoting';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { transactionService } from '@/entities/transaction';
import { validationUtils } from '../lib/validation-utils';
import { type AmountFeeStore, type Validation, type ValidationStartedParams } from '../types/types';

type ValidateParams = {
  id: ID;
  api: ApiPromise;
  chain: Chain;
  asset: Asset;
  transaction: Transaction;
  balances: BalanceMap;
  signerOptions?: Partial<SignerOptions>;
};

const rootValidateFx = createEffect(
  async ({ id, api, chain, asset, transaction, balances, signerOptions }: ValidateParams) => {
    const accountId = transaction.accountId;
    const fee = await transactionService.getTransactionFee(transaction, api, signerOptions);

    const votes = await convictionVotingPallet.storage.votingFor(api, [[accountId, transaction.args.track]]);
    const voting = votes.find((vote) => vote.type === 'Casting');
    const isVoteExist = voting?.data.votes.find((vote) => vote.referendum === +transaction.args.referendum);

    const shardBalance = balanceUtils.getBalance(balances, accountId, chain.chainId, asset.assetId);

    const rules: Validation<BN, { shards: unknown[] }>[] = [
      {
        name: 'insufficientBalanceForFee',
        errorText: t('transfer.notEnoughBalanceForFeeError'),
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
        errorText: t('governance.referendums.vote.noVoteForReferendum'),
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

const validateFx = attach({
  source: {
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    balances: balanceModel.$balanceMap,
  },
  mapParams({ id, transaction, feeMap }: ValidationStartedParams, { chains, balances, apis }) {
    const chain = chains[transaction.chainId];
    const api = apis[transaction.chainId];
    const asset = getAssetById(transaction.args.asset, chain?.assets) || chain?.assets[0]!;

    return {
      id,
      api,
      transaction,
      chain,
      asset,
      balances,
      feeMap,
    };
  },
  effect: rootValidateFx,
});

export const removeVoteValidateModel = {
  validate: validateFx,
};
