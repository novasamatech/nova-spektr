import { render, screen } from '@testing-library/react';
import { allSettled, fork } from 'effector';
import { Provider } from 'effector-react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { type Wallet, CryptoType, SigningType } from '@/shared/core';
import { I18Provider } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { createAccountId, dotAsset, polkadotAssetHubChain } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { ThemeProvider } from '@/shared/ui-kit';
import { type Payee, type StakingPosition } from '@/domains/staking';
import { payeeFlowModel } from '../../model/payee-flow';
import { DestinationStep } from '../DestinationStep';

const accountId = createAccountId('payee-stash') as AccountId;
const bobAddress = toAddress(createAccountId('payee-bob') as AccountId, {
  prefix: polkadotAssetHubChain.addressPrefix,
});

type AccountFixture = Wallet['accounts'][number];

const account: AccountFixture = {
  id: 'payee-account',
  type: 'universal',
  name: 'Alice',
  walletId: 1,
  accountId,
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.POLKADOT_VAULT,
  createdAt: 0,
};

const position = (payee: Payee): StakingPosition => ({
  accountId,
  chainId: polkadotAssetHubChain.chainId,
  stake: {
    accountId,
    chainId: polkadotAssetHubChain.chainId,
    controller: accountId,
    stash: accountId,
    active: '1000000000000',
    total: '1000000000000',
    unlocking: [],
  },
  status: 'active',
  statusReason: null,
  kind: 'nominator',
  validator: null,
  nominations: [],
  activeValidators: [],
  unbonding: [],
  redeemable: '0',
  totalUnbonding: '0',
  payee,
  payeeLoaded: true,
});

const openFlow = async (scope: ReturnType<typeof fork>, payee: Payee) => {
  await allSettled(payeeFlowModel.changeRewardDestinationRequested, {
    scope,
    params: {
      position: position(payee),
      chain: polkadotAssetHubChain,
      asset: dotAsset,
      account,
      wallet: null,
      signingMode: 'local',
    },
  });
};

const renderStep = (scope: ReturnType<typeof fork>) =>
  render(
    <Provider value={scope}>
      <I18Provider>
        <ThemeProvider>
          <MemoryRouter>
            <DestinationStep />
          </MemoryRouter>
        </ThemeProvider>
      </I18Provider>
    </Provider>,
  );

describe('staking-payee-flow · DestinationStep', () => {
  it('opens on Restake with an empty payout field for a staked payee', async () => {
    const scope = fork();
    await openFlow(scope, 'Staked');

    renderStep(scope);

    expect(screen.getByRole('radio', { name: /Restake rewards/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Transferable to account/ })).not.toBeChecked();
    expect(screen.getByRole('combobox')).toHaveValue('');
    // Nothing changed yet, so the form says why the button is dead.
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('opens on the account option with the current payout address filled in', async () => {
    const scope = fork();
    await openFlow(scope, { Account: bobAddress });

    renderStep(scope);

    expect(screen.getByRole('radio', { name: /Transferable to account/ })).toBeChecked();
    expect(screen.getByRole('combobox')).toHaveValue(bobAddress);
  });
});
