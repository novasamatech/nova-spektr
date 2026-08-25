import { render, screen } from '@testing-library/react';
import { allSettled, fork } from 'effector';
import { Provider } from 'effector-react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { type Validator } from '@/shared/core';
import { I18Provider } from '@/shared/i18n';
import { createAccountId, dotAsset, polkadotAssetHubChain } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { ThemeProvider } from '@/shared/ui-kit';
import { type StakingPosition } from '@/domains/staking';
import { authModel, connectionHistoryModel } from '@/aggregates/backend';
import { confirmFlowModel } from '../../model/confirm-flow';
import { Confirmation } from '../Confirmation';

const accountId = createAccountId('contact-stash') as AccountId;

/** An address-book position: tracked by the dashboard, held by no wallet here. */
const position: StakingPosition = {
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
  payee: null,
  payeeLoaded: false,
};

const validator: Validator = {
  accountId,
  chainId: polkadotAssetHubChain.chainId,
  ownStake: '0',
  totalStake: '0',
  commission: 0,
  blocked: false,
  slashed: false,
  apy: 0,
  avgApy: 0,
  nominators: [],
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

describe('staking-confirm-flow · Confirmation', () => {
  /**
   * The confirm is this flow's _first_ screen, so a position with no local
   * account lands straight on it with draft mode already on. It used to bail on
   * the missing initiator, which opened the modal, painted its title and left
   * the body empty — the validator set the user had just picked was discarded
   * with nothing said.
   */
  it('renders for a position with no local account', async () => {
    // A connected address book whose user may write drafts — the picker's own
    // precondition; without it the draft section explains instead of listing.
    const scope = fork({
      values: new Map()
        .set(connectionHistoryModel.$hasEverConnected, true)
        .set(authModel.$authState, { accountId, accountName: 'Backend user', permissions: ['operation-draft:write'] }),
    });

    await allSettled(confirmFlowModel.changeValidatorsRequested, {
      scope,
      params: {
        position,
        chain: polkadotAssetHubChain,
        asset: dotAsset,
        account: null,
        wallet: null,
        signingMode: 'draft',
        validators: [validator],
      },
    });

    renderConfirmation(scope);

    // The body is there: what the operation does, the draft's source section
    // (a plain contact has no draft route, so it explains rather than lists),
    // and the draft affordance that used to sit below the guard that hid it.
    expect(screen.getByText('New validators')).toBeInTheDocument();
    expect(screen.getByText('No account available to create this draft')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save as draft' })).toBeInTheDocument();
  });
});
