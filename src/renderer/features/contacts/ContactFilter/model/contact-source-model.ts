import { combine, createEvent, createStore, sample } from 'effector';

import { contactModel } from '@/entities/contact';
import { authModel, backendConfigurationModel } from '@/aggregates/backend-auth';

const sourceTabChanged = createEvent<string>();

const $sourceTab = createStore<string>('local');

$sourceTab.on(sourceTabChanged, (_, tab) => tab);

$sourceTab.on(authModel.events.signOutClicked, () => 'local');
$sourceTab.on(backendConfigurationModel.events.urlCleared, () => 'local');

type SourceTab = { id: string; label: string };

const $availableSources = combine(
  {
    isAuthenticated: authModel.$isAuthenticated,
    isSessionExpired: authModel.$isSessionExpired,
    backendUrl: backendConfigurationModel.$backendUrl,
    hasBackendContacts: contactModel.$backendContacts.map((cs) => cs.length > 0),
  },
  ({ isAuthenticated, isSessionExpired, backendUrl, hasBackendContacts }): SourceTab[] => {
    const sources: SourceTab[] = [{ id: 'local', label: 'addressBook.sources.myContacts' }];

    const hasActiveBackend = backendUrl && (isAuthenticated || isSessionExpired);
    if (hasActiveBackend || hasBackendContacts) {
      sources.push({ id: 'backend', label: 'addressBook.sources.externalSource' });
    }

    return sources;
  },
);

// When backend becomes available and there are no local contacts, default to backend tab
sample({
  clock: $availableSources,
  source: contactModel.$localContacts,
  filter: (localContacts, sources) => sources.length > 1 && localContacts.length === 0,
  fn: () => 'backend',
  target: $sourceTab,
});

export const contactSourceModel = {
  $sourceTab,
  $availableSources,

  events: {
    sourceTabChanged,
  },
};
