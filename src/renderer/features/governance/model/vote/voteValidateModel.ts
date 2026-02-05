import { type ApiPromise } from '@polkadot/api';
import { type SignerOptions } from '@polkadot/api/submittable/types';
import { BN, BN_ZERO } from '@polkadot/util';
import { attach, createEffect } from 'effector';
import { t } from 'i18next';

import { type Asset, type BalanceMap, type Chain, type ID, type Transaction } from '@/shared/core';
import { assert, getAssetById, getNativeAsset, transferableAmount } from '@/shared/lib/utils';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { governanceService, referendumService } from '@/entities/governance';
import { networkModel } from '@/entities/network';
import { transactionService } from '@/entities/transaction';
import {
  type AmountFeeStore,
  type Validation,
  type ValidationStartedParams,
  validationUtils,
} from '@/features/operations/OperationsValidation';

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
    const referendum = await governanceService.getReferendums(api, [transaction.args.referendum]);
    const isOngoing = referendumService.isOngoing(referendum[0]!);

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
            return feeBN.lte(new BN(accountsBalances[index]!));
          });
        },
      },
      {
        name: 'timeoutReferendum',
        errorText: t('governance.referendums.vote.timeoutReferendumError'),
        value: BN_ZERO,
        form: { shards: [{ accountId }] },
        source: isOngoing,
        validator: (_v, _f, isOngoing: boolean) => {
          return isOngoing;
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
  mapParams({ id, transaction, feeMap }: ValidationStartedParams, { chains, balances, apis }): ValidateParams {
    const chain = chains[transaction.chainId];
    assert(chain, 'Chain not found');
    const api = apis[transaction.chainId];
    assert(api, 'API not found');
    const asset = getAssetById(transaction.args.asset, chain.assets) ?? getNativeAsset(chain.assets);

    return {
      id,
      api,
      transaction,
      chain,
      asset,
      balances,
    };
  },
  effect: rootValidateFx,
});

export const voteValidateModel = {
  validate: validateFx,
};
