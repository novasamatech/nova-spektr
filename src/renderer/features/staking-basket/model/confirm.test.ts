import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { allSettled, createWatch, fork } from 'effector';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  type Chain,
  type ChainId,
  type Transaction,
  type Validator,
  type Wallet,
  TransactionType,
} from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';
import { eraService, validatorsService } from '@/domains/staking';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { type BasketTransaction, basketOperationsService } from '@/aggregates/basket-operations';
import { nominateConfirmModel } from '@/features/operations/OperationsConfirm';

import { confirm } from './confirm';

const chainId = `0x${'1'.padStart(64, '0')}` as ChainId;
const accountId = `0x${'2'.padStart(64, '0')}` as AccountId;
const validatorId = `0x${'3'.padStart(64, '0')}` as AccountId;

const chain = { chainId, name: 'Polkadot', assets: [{ assetId: 0, symbol: 'DOT', precision: 10 }] } as unknown as Chain;
const account = { accountId, walletId: 1 } as unknown as AnyAccount;
const wallet = { id: 1, name: 'Wallet', type: 'wallet_vlt' } as unknown as Wallet;
const validator = { address: toAddress(validatorId), accountId: validatorId } as unknown as Validator;

// Only what the confirmation store touches while checking for a pending multisig.
const api = {
  tx: { staking: { nominate: () => ({ method: { hash: { toHex: () => '0x00' } } }) } },
} as unknown as ApiPromise;

const nominateTx = {
  chainId,
  address: toAddress(accountId),
  accountId,
  type: TransactionType.NOMINATE,
  args: { targets: [validatorId] },
} as unknown as Transaction;

const basketTransaction: BasketTransaction = {
  id: 7,
  initiatorAccountId: accountId,
  coreTx: nominateTx,
  route: [account],
  createdAt: 0,
};

describe('staking basket confirm · change validators', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('populates the nominate confirmation instead of starting signing', async () => {
    vi.spyOn(basketOperationsService, 'getTransactionData').mockResolvedValue({
      chainId,
      chain,
      account,
      fee: new BN(42),
    });
    vi.spyOn(eraService, 'getActiveEra').mockResolvedValue(10);
    vi.spyOn(validatorsService, 'getValidatorsWithInfo').mockResolvedValue({ [validatorId]: validator });

    const scope = fork({
      values: new Map().set(networkModel.$apis, { [chainId]: api }),
      handlers: new Map().set(walletModel.populate, () => [wallet]),
    });
    await allSettled(walletModel.populate, { scope });

    const startSigning = vi.fn();
    const unwatch = createWatch({ unit: nominateConfirmModel.startSigning, fn: startSigning, scope });

    await allSettled(confirm.flow.open, { scope, params: basketTransaction });
    unwatch();

    const item = scope.getState(nominateConfirmModel.$confirmStore)[basketTransaction.id];

    expect(item).toBeDefined();
    expect(item!.meta).toMatchObject({
      chain,
      initiator: account,
      signatory: account,
      validators: [validator],
      route: basketTransaction.route,
      fee: '42',
      coreTx: nominateTx,
    });
    expect(item!.wallets.initiator).toMatchObject(wallet);
    expect(startSigning).not.toHaveBeenCalled();
  });
});
