import { type ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { sortBy } from 'lodash';

import { balanceService } from '@/shared/api/balances';
import { proxyService } from '@/shared/api/proxy';
import { type Asset, type Chain, CryptoType } from '@/shared/core';
import { addUnique, getNativeAsset, nonNullable, nullable, toAccountId, validateAddress } from '@/shared/lib/utils';
import { createMultisigDeposit } from '@/shared/transactions';
import { accounts } from '@/domains/network';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';

import { signatoryModel } from './signatory-model';

const thresholdChanged = createEvent<number | null>();
const populateForm = createEvent<Chain>();
const resetForm = createEvent();
const formSubmit = createEvent();

const $chain = createStore<Chain | null>(null).reset(resetForm);

const $existentialDeposit = createStore(BN_ZERO).reset(resetForm);
const $threshold = restore(thresholdChanged, null).reset(resetForm);

sample({
  clock: populateForm,
  target: $chain,
});

const $asset = $chain.map((chain) => (chain ? getNativeAsset(chain.assets) : null));

const $api = combine(
  {
    apis: networkModel.$apis,
    chain: $chain,
  },
  ({ apis, chain }) => {
    if (!chain) return null;

    return apis[chain.chainId] ?? null;
  },
);

const $newMultisigAccountId = combine(
  {
    threshold: $threshold,
    signatories: signatoryModel.$signatories,
    chain: $chain,
  },
  ({ threshold, signatories, chain }) => {
    if (!chain || !threshold) return null;

    const cryptoType = networkUtils.isEthereumBased(chain.options) ? CryptoType.ETHEREUM : CryptoType.SR25519;
    const sortedSignatories = sortBy(
      Array.from(signatories.values()).map((a) => ({ address: a.address, accountId: toAccountId(a.address) })),
      'accountId',
    );

    return accountUtils.getMultisigAccountId(
      sortedSignatories.map((s) => toAccountId(s.address)),
      threshold,
      cryptoType,
    );
  },
);

type GetDepositParams = {
  api: ApiPromise;
  asset: Asset;
};

const getExistentialDepositFx = createEffect(async ({ api, asset }: GetDepositParams): Promise<BN> => {
  const existentialDeposit = await balanceService.getExistentialDeposit(api, asset);

  return existentialDeposit;
});

sample({
  clock: $api,
  source: $asset,
  filter: (asset, api) => nonNullable(api) && nonNullable(asset),
  fn: (asset, api) => ({ api: api!, asset: asset! }),
  target: getExistentialDepositFx,
});

sample({
  clock: getExistentialDepositFx.doneData,
  target: $existentialDeposit,
});

const $proxyDeposit = combine($api, (api) => (api && proxyService.getProxyDeposit(api, '0', 1)) ?? null);

const $totalDeposit = combine($existentialDeposit, $proxyDeposit, (existentialDeposit, proxyDeposit) => {
  if (nullable(proxyDeposit)) return null;

  return existentialDeposit.add(new BN(proxyDeposit));
});

const { $multisigDeposit, $pending: $pendingMultisigDeposit } = createMultisigDeposit({
  $threshold: $threshold,
  $api: $api,
});

const $invalidAddresses = combine(
  {
    chain: $chain,
    signatories: signatoryModel.$signatories,
  },
  ({ chain, signatories }) => {
    if (!chain) return [];

    let badSignatories: string[] = [];

    for (const signer of signatories) {
      if (!signer.address || validateAddress(signer.address, chain)) continue;

      badSignatories = addUnique(badSignatories, signer.address);
    }

    return badSignatories;
  },
);

const $isMultisigExists = combine(
  {
    accounts: accounts.$list,
    multisigAccountId: $newMultisigAccountId,
  },
  ({ multisigAccountId, accounts }) => {
    if (nullable(multisigAccountId)) return false;

    return nonNullable(
      accounts.find((a) => {
        if (!accountUtils.isMultisigAccount(a)) return false;
        return a.accountId === multisigAccountId;
      }),
    );
  },
);

export const formModel = {
  $api,
  $totalDeposit,
  $multisigDeposit,
  $pendingMultisigDeposit,
  $invalidAddresses,
  $isMultisigExists,
  $chain,

  $threshold,
  $newMultisigAccountId,
  $proxyDeposit,
  $asset,

  resetForm,
  populateForm,
  thresholdChanged,
  formSubmit,
};
