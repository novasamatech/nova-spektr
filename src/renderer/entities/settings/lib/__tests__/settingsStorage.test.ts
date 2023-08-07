import { UserSettings } from '../common/constants';
import { useSettingsStorage } from '../settingsStorage';

describe('services/settings/settingsStorage', () => {
  afterEach(() => {
    localStorage.clear();
  });

  test('should return all methods', () => {
    const { setHideZeroBalance, getHideZeroBalance, setStakingNetwork, getStakingNetwork } = useSettingsStorage();

    expect(setHideZeroBalance).toBeDefined();
    expect(getHideZeroBalance).toBeDefined();
    expect(setStakingNetwork).toBeDefined();
    expect(getStakingNetwork).toBeDefined();
  });

  test('should set and get hide_zero_balances', () => {
    const { setHideZeroBalance, getHideZeroBalance } = useSettingsStorage();

    expect(localStorage.getItem(UserSettings.HIDE_ZERO_BALANCE)).toBeNull();
    setHideZeroBalance(true);
    expect(getHideZeroBalance()).toEqual(true);
  });

  test('should set and get staking_network', () => {
    const chainId = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';
    const { setStakingNetwork, getStakingNetwork } = useSettingsStorage();

    expect(localStorage.getItem(UserSettings.STAKING_NETWORK)).toBeNull();
    setStakingNetwork(chainId);
    expect(getStakingNetwork()).toEqual(chainId);
  });

  test('should get empty staking_network', () => {
    const { getStakingNetwork } = useSettingsStorage();

    expect(localStorage.getItem(UserSettings.STAKING_NETWORK)).toBeNull();
    expect(getStakingNetwork()).toEqual('');
  });
});
