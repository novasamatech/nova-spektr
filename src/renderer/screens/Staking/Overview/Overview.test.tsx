import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { useNetworkContext } from '@renderer/context/NetworkContext';
import { Chain } from '@renderer/domain/chain';
import { ConnectionType } from '@renderer/domain/connection';
import { TEST_ACCOUNT_ID } from '@renderer/shared/utils/constants';
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
    getChainsData: jest.fn().mockResolvedValue([
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
    getActiveAccounts: () => [{ name: 'Test Wallet', accountId: TEST_ACCOUNT_ID }],
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

jest.mock('./components/NetworkInfo/NetworkInfo', () => () => <span>networkInfo</span>);
// jest.mock('./components/AboutStaking/AboutStaking', () => () => <span>aboutStaking</span>);
jest.mock('./components/StakingList/StakingList', () => () => <span>stakingTable</span>);
// jest.mock('./components/ValidatorsModal/ValidatorsModal', () => () => <span>nominatorsModal</span>);

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
      render(<Overview />, { wrapper: MemoryRouter });
    });

    const title = screen.getByText('staking.title');
    const stakingList = screen.getByText('stakingTable');
    // const nominatorsModal = screen.getByText('nominatorsModal');
    expect(title).toBeInTheDocument();
    expect(stakingList).toBeInTheDocument();
    // expect(nominatorsModal).toBeInTheDocument();
  });

  // test('should render network settings link', async () => {
  //   (useNetworkContext as jest.Mock).mockImplementation(() => ({
  //     connections: {
  //       '0x00': { connection: { connectionType: ConnectionType.DISABLED } },
  //     },
  //   }));
  //
  //   await act(async () => {
  //     render(<Overview />, { wrapper: MemoryRouter });
  //   });
  //
  //   const title = screen.getByText('staking.overview.networkSettingsLink');
  //   expect(title).toBeInTheDocument();
  // });
});
