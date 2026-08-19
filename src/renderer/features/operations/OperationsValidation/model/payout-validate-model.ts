import { type ApiPromise } from '@polkadot/api';
import { type SignerOptions } from '@polkadot/api/submittable/types';
import { BN, BN_ZERO } from '@polkadot/util';
import { attach, createEffect } from 'effector';
import { t } from 'i18next';

import { type Asset, type BalanceMap, type Chain, type ID, type Transaction } from '@/shared/core';
import { getNativeAsset, transferableAmount } from '@/shared/lib/utils';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { transactionService } from '@/entities/transaction';
import { validationUtils } from '../lib/validation-utils';
import { type AmountFeeStore, type Validation, type ValidationStartedParams } from '../types/types';

/**
 * A claim moves no money of the payer's own, so the only thing that can stop it
 * is the fee.
 *
 * Everything else `payout_stakers_by_page` needs — the era still being inside
 * `historyDepth`, the page not being claimed already — is enforced by the
 * runtime and cannot be re-derived here without racing it. What the app _can_
 * answer, and what the basket used to skip entirely for claims, is whether the
 * account that will send it can pay for sending it.
 *
 * The fee is quoted for the transaction as submitted: a claim spanning several
 * payouts is one `batchAll`, and pricing a single inner call would understate
 * it several-fold.
 */
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
  effect({ chains, apis, balances }, { id, transaction, signerOptions }: ValidationStartedParams) {
    const chain = chains[transaction.chainId];
    const api = apis[transaction.chainId];
    if (!chain || !api) {
      return { id, result: undefined };
    }

    // Staking lives on Asset Hub, where the fee is paid in the native asset —
    // not necessarily the chain's first one.
    const asset = getNativeAsset(chain.assets);
    if (!asset) {
      return { id, result: undefined };
    }

    return rootValidateFx({
      id,
      api,
      transaction,
      chain,
      asset,
      balances,
      signerOptions,
    });
  },
});

export const payoutValidateModel = {
  validate: validateFx,
};
