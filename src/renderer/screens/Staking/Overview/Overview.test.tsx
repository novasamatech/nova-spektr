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
    setGraphqlEndpoint: jest.fn(),
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
        name: 'Test Wallet',
        accountId: TEST_ADDRESS,
        publicKey: TEST_PUBLIC_KEY,
      },
    ],
  }),
}));

jest.mock('@renderer/services/staking/stakingDataService', () => ({
  useStakingData: jest.fn().mockReturnValue({
    staking: {},
    subscribeActiveEra: jest.fn(),
    subscribeLedger: jest.fn(),
  }),
}));

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('./components/AboutStaking/AboutStaking', () => () => <span>aboutStaking</span>);
jest.mock('./components/InfoBanners/InfoBanners', () => () => <span>infoBanners</span>);
jest.mock('./components/Filter/Filter', () => () => <span>filter</span>);
jest.mock('./components/StakingList/StakingList', () => () => <span>stakingList</span>);
jest.mock('./components/TotalAmount/TotalAmount', () => () => <span>totalAmount</span>);

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
    const aboutStaking = screen.getByText('aboutStaking');
    const infoBanners = screen.getByText('infoBanners');
    const filter = screen.getByText('filter');
    const stakingList = screen.getByText('stakingList');
    const totalAmount = screen.getByText('totalAmount');
    expect(title).toBeInTheDocument();
    expect(aboutStaking).toBeInTheDocument();
    expect(infoBanners).toBeInTheDocument();
    expect(filter).toBeInTheDocument();
    expect(stakingList).toBeInTheDocument();
    expect(totalAmount).toBeInTheDocument();
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
