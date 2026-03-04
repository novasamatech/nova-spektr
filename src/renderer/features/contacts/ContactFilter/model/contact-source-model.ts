import { combine, createEvent, createStore, sample } from 'effector';

import { contactModel } from '@/entities/contact';
import { authModel, backendConfigurationModel } from '../../BackendConfiguration';

const sourceTabChanged = createEvent<string>();

const $sourceTab = createStore<string>('local');

$sourceTab.on(sourceTabChanged, (_, tab) => tab);

// Reset to local on sign out or URL cleared
$sourceTab.on(authModel.events.signOutClicked, () => 'local');
$sourceTab.on(backendConfigurationModel.events.urlCleared, () => 'local');

const $availableSources = combine(
  {
    hasBackend: backendConfigurationModel.$hasBackend,
    isAuthenticated: authModel.$isAuthenticated,
    backendUrl: backendConfigurationModel.$backendUrl,
  },
  ({ hasBackend, isAuthenticated, backendUrl }) => {
    if (!hasBackend || !isAuthenticated || !backendUrl) {
      return [];
    }

    return [{ id: 'local' }, { id: backendUrl }];
  },
);

// When backend becomes available and there are no local contacts, default to backend tab
sample({
  clock: $availableSources,
  source: contactModel.$localContacts,
  filter: (localContacts, sources) => sources.length > 0 && localContacts.length === 0,
  fn: (_localContacts, sources) => sources.find((s) => s.id !== 'local')!.id,
  target: $sourceTab,
});

export const contactSourceModel = {
  $sourceTab,
  $availableSources,

  events: {
    sourceTabChanged,
  },
};
