import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { useNetworkContext } from '@renderer/context/NetworkContext';
import { Chain } from '@renderer/domain/chain';
import { ConnectionType } from '@renderer/domain/connection';
import { TEST_ADDRESS, TEST_PUBLIC_KEY } from '@renderer/services/balance/common/constants';
import Overview from './Overview';

jest.mock('@renderer/context/NetworkContext', () => ({
  useNetworkContext: jest.fn(() => ({
    connections: {},
  })),
}));

jest.mock('@renderer/context/GraphqlContext', () => ({
  useGraphql: jest.fn(() => ({
    changeClient: jest.fn(),
  })),
}));

jest.mock('@renderer/services/network/chainsService', () => ({
  useChains: jest.fn().mockReturnValue({
    sortChains: (value: Chain[]) => value,
    getChainsData: jest.fn().mockReturnValue([
      {
        addressPrefix: 0,
        assets: [{ staking: 'relaychain' }],
        chainId: '0x00',
        name: 'My test chain',
      },
    ]),
  }),
}));

jest.mock('@renderer/services/account/accountService', () => ({
  useAccount: jest.fn().mockReturnValue({
    getActiveAccounts: () => [
      {
        name: 'Test account',
        accountId: TEST_ADDRESS,
        publicKey: TEST_PUBLIC_KEY,
      },
    ],
  }),
}));

jest.mock('@renderer/services/wallet/walletService', () => ({
  useWallet: jest.fn().mockReturnValue({
    getLiveWallets: jest.fn().mockReturnValue([]),
  }),
}));

jest.mock('@renderer/services/staking/stakingDataService', () => ({
  useStakingData: jest.fn().mockReturnValue({
    staking: {},
    subscribeLedger: jest.fn(),
  }),
}));

jest.mock('@renderer/services/staking/validatorsService', () => ({
  useValidators: jest.fn().mockReturnValue({
    getValidators: jest.fn(),
  }),
}));

jest.mock('@renderer/services/staking/eraService', () => ({
  useEra: jest.fn().mockReturnValue({
    subscribeActiveEra: jest.fn(),
  }),
}));

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/services/staking/stakingRewardsService', () => ({
  useStakingRewards: jest.fn().mockReturnValue({
    rewards: {},
    isLoading: false,
  }),
}));

jest.mock('./components/AboutStaking/AboutStaking', () => () => <span>aboutStaking</span>);
jest.mock('./components/InfoBanners/InfoBanners', () => () => <span>infoBanners</span>);
jest.mock('./components/Filter/Filter', () => () => <span>filter</span>);
jest.mock('./components/List/StakingList/StakingList', () => () => <span>stakingList</span>);
jest.mock('./components/TotalAmount/TotalAmount', () => () => <span>totalAmount</span>);
jest.mock('./components/MyNominatorsModal/MyNominatorsModal', () => () => <span>nominatorsModal</span>);

describe('screens/Staking/Overview', () => {
  beforeEach(() => {
    (useNetworkContext as jest.Mock).mockImplementation(() => ({
      connections: { '0x00': { connection: { connectionType: ConnectionType.LIGHT_CLIENT } } },
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render component', async () => {
    await act(async () => {
      render(<Overview />);
    });

    const title = screen.getByText('staking.title');
    const stakingList = screen.getByText('stakingList');
    const totalAmount = screen.getByText('totalAmount');
    const nominatorsModal = screen.getByText('nominatorsModal');
    expect(title).toBeInTheDocument();
    expect(stakingList).toBeInTheDocument();
    expect(totalAmount).toBeInTheDocument();
    expect(nominatorsModal).toBeInTheDocument();
  });

  test('should render network settings link', async () => {
    (useNetworkContext as jest.Mock).mockImplementation(() => ({
      connections: {
        '0x00': { connection: { connectionType: ConnectionType.DISABLED } },
      },
    }));

    await act(async () => {
      render(<Overview />, { wrapper: MemoryRouter });
    });

    const title = screen.getByText('staking.overview.networkSettingsLink');
    expect(title).toBeInTheDocument();
  });
});
