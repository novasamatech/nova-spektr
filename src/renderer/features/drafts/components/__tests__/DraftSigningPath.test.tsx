import { render, screen } from '@testing-library/react';
import { allSettled, createEvent, createStore, fork } from 'effector';
import { Provider } from 'effector-react';
import { describe, expect, it } from 'vitest';

import { type BackendContact } from '@/shared/core';
import { I18Provider } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { createAccountId, dotAsset, polkadotAssetHubChain } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { ThemeProvider } from '@/shared/ui-kit';
import { type PathNode } from '@/domains/backend';
import { contactModel } from '@/entities/contact';
import { DraftSigningPath } from '../DraftSigningPath';

const TEAM_MULTISIG = createAccountId('team-multisig') as AccountId;
const OTHER_MULTISIG = createAccountId('other-multisig') as AccountId;
const SIGNATORY = createAccountId('signatory') as AccountId;

const multisigContact = (accountId: AccountId, name: string): BackendContact => ({
  id: name,
  name,
  address: toAddress(name),
  accountId,
  source: 'backend',
  chainId: null,
  chainName: null,
  derivationPath: null,
  ownerAccountId: null,
  signatories: [SIGNATORY],
  threshold: 1,
  fields: [],
});

const noop = createEvent<PathNode[]>();
const noopVoid = createEvent();
const $draftPath = createStore<PathNode[]>([]);

const renderPicker = async (pinnedSourceAccountId: AccountId | null) => {
  const scope = fork();

  // Drafts are shared through the external address book, so the graph only
  // offers sources that are entries in it.
  await allSettled(contactModel.events.backendContactsReceived, {
    scope,
    params: [multisigContact(TEAM_MULTISIG, 'Team multisig'), multisigContact(OTHER_MULTISIG, 'Other multisig')],
  });

  return render(
    <Provider value={scope}>
      <I18Provider>
        <ThemeProvider>
          <DraftSigningPath
            chainId={polkadotAssetHubChain.chainId}
            asset={dotAsset}
            pinnedSourceAccountId={pinnedSourceAccountId}
            $draftPath={$draftPath}
            draftPathCommitted={noop}
            draftPathEditStarted={noopVoid}
            draftPathEditEnded={noopVoid}
          />
        </ThemeProvider>
      </I18Provider>
    </Provider>,
  );
};

describe('features/drafts/components/DraftSigningPath', () => {
  it('offers every address-book source when nothing is pinned', async () => {
    await renderPicker(null);

    expect(await screen.findByText('Team multisig')).toBeInTheDocument();
    expect(screen.getByText('Other multisig')).toBeInTheDocument();
  });

  /**
   * The rule this component exists to enforce for callers that opened it for a
   * specific account. A draft records the exact route it is submitted along and
   * executes from the path's first node, so a draft authored for one position
   * but sourced at another address fails at submission for want of rights —
   * after it has been reviewed and co-signed.
   */
  it('offers only the pinned source, and never the others', async () => {
    await renderPicker(TEAM_MULTISIG);

    expect(await screen.findByText('Team multisig')).toBeInTheDocument();
    expect(screen.queryByText('Other multisig')).not.toBeInTheDocument();
  });

  it('offers nothing when the pinned address is not a source the graph can route from', async () => {
    // A plain contact — no multisig, no proxy. Rather than quietly falling back
    // to some other account the user never asked about, the picker stays empty;
    // the dashboard is meant to have blocked the row before it got here.
    await renderPicker(SIGNATORY);

    expect(screen.queryByText('Team multisig')).not.toBeInTheDocument();
    expect(screen.queryByText('Other multisig')).not.toBeInTheDocument();
  });
});
