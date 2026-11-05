import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { render, screen, within } from '@testing-library/react';
import { allSettled, fork } from 'effector';
import { Provider } from 'effector-react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  type Chain,
  type ChainId,
  type Transaction,
  type Validator,
  type Wallet,
  SigningType,
  TransactionType,
} from '@/shared/core';
import { I18Provider } from '@/shared/i18n';
import { toAddress, truncate } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { ThemeProvider } from '@/shared/ui-kit';
import { type AnyAccount } from '@/domains/network';
import { eraService, validatorsService } from '@/domains/staking';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { type BasketTransaction, basketOperationsService } from '@/aggregates/basket-operations';
import { NominateConfirmation } from '@/features/operations/OperationsConfirm';

import { confirm } from './confirm';

const chainId = `0x${'1'.padStart(64, '0')}` as ChainId;
const accountId = `0x${'2'.padStart(64, '0')}` as AccountId;
const validatorIds = [`0x${'3'.padStart(64, '0')}`, `0x${'4'.padStart(64, '0')}`] as AccountId[];

const chain = {
  chainId,
  name: 'Polkadot',
  addressPrefix: 0,
  assets: [{ assetId: 0, symbol: 'DOT', precision: 10 }],
} as unknown as Chain;
const account = {
  accountId,
  walletId: 1,
  name: 'Stash',
  type: 'universal',
  signingType: SigningType.POLKADOT_VAULT,
} as unknown as AnyAccount;
const wallet = { id: 1, name: 'Wallet', type: 'wallet_vlt' } as unknown as Wallet;
const validators = validatorIds.map(
  (validatorId) => ({ address: toAddress(validatorId), accountId: validatorId }) as unknown as Validator,
);

// Only what the confirmation store touches while checking for a pending multisig.
const api = {
  tx: { staking: { nominate: () => ({ method: { hash: { toHex: () => '0x00' } } }) } },
} as unknown as ApiPromise;

const nominateTx = {
  chainId,
  address: toAddress(accountId),
  accountId,
  type: TransactionType.NOMINATE,
  args: { targets: validatorIds },
} as unknown as Transaction;

const basketTransaction: BasketTransaction = {
  id: 7,
  initiatorAccountId: accountId,
  coreTx: nominateTx,
  route: [account],
  createdAt: 0,
};

/** 1.25 DOT, as the fee reads on screen. */
const FEE = new BN('12500000000');

describe('staking basket confirm · change validators · rendered confirmation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('SP-21: the basket entry confirmation lists the validators, the fee and the account', async () => {
    // The chain is the boundary: fee and validator lookups are answered here,
    // the confirmation model and its screen are the real thing.
    vi.spyOn(basketOperationsService, 'getTransactionData').mockResolvedValue({ chainId, chain, account, fee: FEE });
    vi.spyOn(eraService, 'getActiveEra').mockResolvedValue(10);
    vi.spyOn(validatorsService, 'getValidatorsWithInfo').mockResolvedValue({
      [validatorIds[0]!]: validators[0]!,
      [validatorIds[1]!]: validators[1]!,
    });

    const scope = fork({
      values: new Map().set(networkModel.$apis, { [chainId]: api }),
      handlers: new Map().set(walletModel.populate, () => [wallet]),
    });
    await allSettled(walletModel.populate, { scope });
    await allSettled(confirm.flow.open, { scope, params: basketTransaction });

    render(
      <Provider value={scope}>
        <I18Provider>
          <ThemeProvider>
            <NominateConfirmation id={basketTransaction.id} hideSignButton />
          </ThemeProvider>
        </I18Provider>
      </Provider>,
    );

    // Validators: the row counts the targets of the stored call.
    const validatorsLabel = await screen.findByText('Validators');
    expect(within(validatorsLabel.closest('div')!).getByText(String(validators.length))).toBeInTheDocument();

    // Fee: quoted, not a loader.
    const feeRow = screen.getByTestId('operations-estimate-fee');
    expect(within(feeRow).getByTestId('AssetBalance')).toHaveTextContent('1.25 DOT');
    expect(within(feeRow).queryByTestId('fee-loader')).not.toBeInTheDocument();

    // Account: the initiator of the basket entry, by its address.
    const accountLabel = screen.getByText('Account');
    const accountRow = within(accountLabel.closest('div')!);
    expect(
      accountRow.getByText(truncate(toAddress(accountId, { prefix: chain.addressPrefix }), 6, 6)),
    ).toBeInTheDocument();
  });
});
