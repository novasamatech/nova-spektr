import { type BasePageElements } from './BasePageElements';

export class SettingsPageElements implements BasePageElements {
  url = '/#/settings';
  networksUrl = '/#/settings/network';

  // Network status labels
  connectedStatus = 'Connected';
  connectingStatus = 'Connecting';

  // Active networks section
  activeNetworksLabel = 'Active networks';
}
