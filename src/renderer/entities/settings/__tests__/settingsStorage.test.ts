import { UserSettings } from '../lib/types';
import { settingsStorage } from '../settingsStorage';

describe('services/settings/settingsStorage', () => {
  afterEach(() => {
    localStorage.clear();
  });

  test('should set and get staking_network', () => {
    const chainId = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';

    expect(localStorage.getItem(UserSettings.STAKING_NETWORK)).toBeNull();
    settingsStorage.setStakingNetwork(chainId);
    expect(settingsStorage.getStakingNetwork()).toEqual(chainId);
  });

  test('should get empty staking_network', () => {
    expect(localStorage.getItem(UserSettings.STAKING_NETWORK)).toBeNull();
    expect(settingsStorage.getStakingNetwork()).toEqual('');
  });
});
