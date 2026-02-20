import { combine, createEvent, createStore } from 'effector';

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

    let label: string;
    try {
      label = new URL(backendUrl).hostname;
    } catch {
      label = backendUrl;
    }

    return [
      { id: 'local', label: 'My Contacts' },
      { id: backendUrl, label },
    ];
  },
);

export const contactSourceModel = {
  $sourceTab,
  $availableSources,

  events: {
    sourceTabChanged,
  },
};
