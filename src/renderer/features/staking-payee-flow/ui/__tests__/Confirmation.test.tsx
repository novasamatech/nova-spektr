import { render, screen } from '@testing-library/react';
import { allSettled, fork } from 'effector';
import { Provider } from 'effector-react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { type Wallet, ConnectionStatus, CryptoType, SigningType } from '@/shared/core';
import { I18Provider } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { createAccountId, createPolkadotWallet, dotAsset, polkadotAssetHubChain } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { ThemeProvider } from '@/shared/ui-kit';
import { type Payee, type StakingPosition } from '@/domains/staking';
import { networkModel } from '@/entities/network';
import { authModel, connectionHistoryModel } from '@/aggregates/backend';
import { payeeFlowModel } from '../../model/payee-flow';
import { Confirmation } from '../Confirmation';

const accountId = createAccountId('payee-stash') as AccountId;
const bobAccountId = createAccountId('payee-bob') as AccountId;
const bobAddress = toAddress(bobAccountId, { prefix: polkadotAssetHubChain.addressPrefix });

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

const wallet = createPolkadotWallet(1, { rootAccountId: accountId, name: 'Alice vault' });

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
      wallet,
      signingMode: 'local',
    },
  });
};

const renderConfirmation = (scope: ReturnType<typeof fork>) =>
  render(
    <Provider value={scope}>
      <I18Provider>
        <ThemeProvider>
          <MemoryRouter>
            <Confirmation />
          </MemoryRouter>
        </ThemeProvider>
      </I18Provider>
    </Provider>,
  );

const connected = () =>
  new Map().set(networkModel.$connectionStatuses, {
    [polkadotAssetHubChain.chainId]: ConnectionStatus.CONNECTED,
  });

describe('staking-payee-flow · Confirmation', () => {
  it('names the new destination as Restaked with the dashboard wording', async () => {
    const scope = fork({ values: connected() });
    await openFlow(scope, { Account: bobAddress });
    await allSettled(payeeFlowModel.optionChanged, { scope, params: 'restake' });

    renderConfirmation(scope);

    expect(screen.getByText('New destination')).toBeInTheDocument();
    expect(screen.getByText('Restaked')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('asks for an acknowledgement when the payout account is unknown', async () => {
    // A connected, healthy address book that knows neither Bob nor any wallet
    // account — the one state in which the aggregate answers `unknown`.
    const scope = fork({
      values: connected()
        .set(connectionHistoryModel.$hasEverConnected, true)
        .set(authModel.$authState, { accountId, accountName: 'Backend user', permissions: [] }),
    });
    await openFlow(scope, 'Staked');
    await allSettled(payeeFlowModel.optionChanged, { scope, params: 'account' });
    await allSettled(payeeFlowModel.addressChanged, { scope, params: bobAddress });

    expect(scope.getState(payeeFlowModel.$recipientWarning)).toBe('unknown');

    renderConfirmation(scope);

    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign' })).toBeDisabled();
  });
});
