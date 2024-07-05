import { Store, createEffect, createEvent, sample } from 'effector';
import { ApiPromise } from '@polkadot/api';
import { SignerOptions } from '@polkadot/api/submittable/types';

import { Asset, Balance, Chain, ID, Transaction } from '@shared/core';
import { toAccountId } from '@shared/lib/utils';
import { balanceModel } from '@entities/balance';
import { SignatoryStore, ValidationResult } from '../types/types';
import { validationUtils } from '../lib/validation-utils';
import { networkModel } from '@entities/network';
import { transactionService } from '@entities/transaction';
import { RemovePureProxiedRules } from '../lib/remove-pure-proxied-rules';

const validationStarted = createEvent<{ id: ID; transaction: Transaction; signerOptions?: Partial<SignerOptions> }>();
const txValidated = createEvent<{ id: ID; result: ValidationResult }>();

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

    const rules = [
      {
        value: { accountId },
        form: {
          chain,
        },
        ...RemovePureProxiedRules.account.notEnoughTokens({} as Store<SignatoryStore>),
        source: {
          fee,
          isMultisig: false,
          proxyDeposit: '0',
          multisigDeposit: '0',
          balances,
        } as SignatoryStore,
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
  filter: ({ apis }, { transaction }) => Boolean(apis[transaction.chainId]),
  fn: ({ apis, chains, balances }, { id, transaction, signerOptions }) => {
    const chain = chains[transaction.chainId];
    const api = apis[transaction.chainId];
    const asset = chain.assets[0];

    return {
      id,
      api,
      transaction,
      chain,
      asset,
      balances,
      signerOptions,
    };
  },
  target: validateFx,
});

sample({
  clock: validateFx.doneData,
  target: txValidated,
});

export const removePureProxiedValidateModel = {
  events: {
    validationStarted,
  },
  output: {
    txValidated,
  },
};
