import { render, screen } from '@testing-library/react';
import { allSettled, createEvent, createStore, fork } from 'effector';
import { Provider } from 'effector-react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { type BackendContact } from '@/shared/core';
import { I18Provider } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { createAccountId, dotAsset, polkadotAssetHubChain } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { ThemeProvider } from '@/shared/ui-kit';
import { type PathNode } from '@/domains/backend';
import { contactModel } from '@/entities/contact';
import { authModel, connectionHistoryModel } from '@/aggregates/backend';
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

type Book = 'ready' | 'offline' | 'noPermission';

const bookValues = (book: Book) => {
  const values = new Map().set(connectionHistoryModel.$hasEverConnected, true);
  if (book === 'offline') return values;

  const permissions = book === 'ready' ? ['operation-draft:write'] : [];

  return values.set(authModel.$authState, { accountId: SIGNATORY, accountName: 'Backend user', permissions });
};

const renderPicker = async (pinnedSourceAccountId: AccountId | null, book: Book = 'ready') => {
  const scope = fork({ values: bookValues(book) });

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
          <MemoryRouter>
            <DraftSigningPath
              chainId={polkadotAssetHubChain.chainId}
              asset={dotAsset}
              pinnedSourceAccountId={pinnedSourceAccountId}
              $draftPath={$draftPath}
              draftPathCommitted={noop}
              draftPathEditStarted={noopVoid}
              draftPathEditEnded={noopVoid}
            />
          </MemoryRouter>
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

  it('explains instead of listing when the pinned address is not a source the graph can route from', async () => {
    // A plain contact — no multisig, no proxy. Rather than quietly falling back
    // to some other account the user never asked about, the picker says so and
    // points at the address book, where the fix lives.
    await renderPicker(SIGNATORY);

    expect(await screen.findByText('No account available to create this draft')).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(toAddress(SIGNATORY, { prefix: polkadotAssetHubChain.addressPrefix }))),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open address book' })).toBeInTheDocument();
    expect(screen.queryByText('Team multisig')).not.toBeInTheDocument();
    expect(screen.queryByText('Other multisig')).not.toBeInTheDocument();
  });

  it('renders nothing while the address book is offline', async () => {
    // The mode card above carries the Reconnect prompt; a dead list under it
    // would only contradict it.
    await renderPicker(null, 'offline');

    expect(screen.queryByText('Source account')).not.toBeInTheDocument();
    expect(screen.queryByText('Team multisig')).not.toBeInTheDocument();
    expect(screen.queryByText('No account available to create this draft')).not.toBeInTheDocument();
  });

  it('says the user may not write drafts instead of offering sources', async () => {
    await renderPicker(TEAM_MULTISIG, 'noPermission');

    expect(
      await screen.findByText(/You have no permission to create drafts, so nothing can be prepared from/),
    ).toBeInTheDocument();
    expect(screen.queryByText('Team multisig')).not.toBeInTheDocument();
  });
});
