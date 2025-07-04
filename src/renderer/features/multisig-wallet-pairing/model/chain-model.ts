import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { combine, createEffect, createStore, sample } from 'effector';
import { createGate } from 'effector-react';
import { spread } from 'patronum';

import { type Asset, type Chain, type Transaction } from '@/shared/core';
import { series } from '@/shared/effector/series';
import { TEST_ACCOUNTS, getNativeAsset, nonNullable, nullable, withdrawableAmountBN } from '@/shared/lib/utils';
import { accountService, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { transactionBuilder, transactionService } from '@/entities/transaction';

import { flowModel } from './flow-model';

type ChainWithFeeAndBalance = {
  chain: Chain;
  fee: string;
  balance: string;
  asset: Asset;
};

const flow = createGate();

const $multisigChains = combine(networkModel.$chains, chains => {
  return Object.values(chains).filter(chain => networkUtils.isMultisigSupported(chain.options));
});

const calculateFeeForChainFx = createEffect(
  async ({ chain, tx, api }: { chain: Chain; tx: Transaction; api: ApiPromise | null }) => {
    if (!api) return { chain, fee: null };

    try {
      const fee = await transactionService.getTransactionFee(tx, api);
      return { chain, fee };
    } catch {
      return { chain, fee: null };
    }
  },
);

const calculateFeesSeriesFx = series(calculateFeeForChainFx, { parallel: true, skipErrors: true });

sample({
  clock: flow.open,
  source: {
    multisigChains: $multisigChains,
    apis: networkModel.$apis,
    tx: flowModel.$tx,
  },
  fn: ({ multisigChains, apis, tx }) => {
    return multisigChains.map(chain => {
      const fakeTx = transactionBuilder.buildRemark({
        chainId: chain.chainId,
        accountId: TEST_ACCOUNTS[0],
        threshold: 2,
        signatories: [TEST_ACCOUNTS[0], TEST_ACCOUNTS[1]],
      });

      const transaction = tx ? { ...tx, chainId: chain.chainId, accountId: TEST_ACCOUNTS[0] } : fakeTx;

      return { chain, tx: transaction, api: apis[chain.chainId] ?? null };
    });
  },
  target: calculateFeesSeriesFx,
});

const $availableChains = createStore<ChainWithFeeAndBalance[]>([]);
const $unavailableChains = createStore<ChainWithFeeAndBalance[]>([]);

sample({
  clock: calculateFeesSeriesFx.doneData,
  source: {
    signer: flowModel.$signer,
    balances: balanceModel.$balances,
    accounts: accounts.$list,
  },
  filter: ({ signer }) => nonNullable(signer),
  fn: ({ signer, balances, accounts }, chains) => {
    const availableChains = [];
    const unavailableChains = [];
    const accountList = accountService.filterAccountsByWallet(accounts, signer!.walletId);

    for (const { chain, fee } of chains) {
      const asset = getNativeAsset(chain.assets);
      const signerForChain = accountList.find(account => accountService.isAccountAvailableOnChain(account, chain));

      if (!signerForChain) {
        unavailableChains.push({ chain, fee: fee ?? '0', asset, balance: '0' });
        continue;
      }

      const balance = balanceUtils.getBalance(
        balances,
        signerForChain.accountId,
        chain.chainId,
        asset.assetId.toString(),
      );
      const withdrawable = withdrawableAmountBN(balance);

      if (nullable(fee)) {
        unavailableChains.push({ chain, fee: '0', asset, balance: withdrawable.toString() });
        continue;
      }

      if (withdrawable.lt(new BN(fee))) {
        unavailableChains.push({ chain, fee, asset, balance: withdrawable.toString() });
        continue;
      }

      availableChains.push({ chain, fee, asset, balance: withdrawable.toString() });
    }

    return {
      availableChains,
      unavailableChains,
    };
  },
  target: spread({
    availableChains: $availableChains,
    unavailableChains: $unavailableChains,
  }),
});

export const chainSelectorModel = {
  $availableChains,
  $unavailableChains,
  $isLoading: calculateFeesSeriesFx.pending,
  $multisigChains,

  flow,
};
