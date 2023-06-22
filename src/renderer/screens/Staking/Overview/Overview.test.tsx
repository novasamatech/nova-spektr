import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { useNetworkContext } from '@renderer/context/NetworkContext';
import { Chain } from '@renderer/domain/chain';
import { ConnectionType } from '@renderer/domain/connection';
import { TEST_ACCOUNT_ID } from '@renderer/shared/utils/constants';
import { Overview } from './Overview';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

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

jest.mock('@renderer/services/staking/stakingDataService', () => ({
  useStakingData: jest.fn().mockReturnValue({
    staking: {},
    subscribeLedger: jest.fn(),
  }),
}));

jest.mock('@renderer/services/staking/validatorsService', () => ({
  useValidators: jest.fn().mockReturnValue({
    getValidatorsWithInfo: jest.fn(),
  }),
}));

jest.mock('@renderer/services/staking/eraService', () => ({
  useEra: jest.fn().mockReturnValue({
    subscribeActiveEra: jest.fn(),
  }),
}));

jest.mock('@renderer/services/staking/stakingRewardsService', () => ({
  useStakingRewards: jest.fn().mockReturnValue({
    rewards: {},
    isLoading: false,
  }),
}));

jest.mock('./components', () => ({
  Actions: () => <span>actions</span>,
  AboutStaking: () => <span>aboutStaking</span>,
  NominatorsList: () => <span>nominatorsList</span>,
  ValidatorsModal: () => <span>validatorsModal</span>,
  InactiveChain: () => <span>inactiveChain</span>,
  NetworkInfo: ({ onNetworkChange }: any) => (
    <button type="button" onClick={() => onNetworkChange({ chainId: '0x00', name: 'Polkadot', addressPrefix: 0 })}>
      networkInfo
    </button>
  ),
}));

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
    const actions = screen.getByText('actions');
    const nominatorsList = screen.getByText('nominatorsList');
    const validatorsModal = screen.getByText('validatorsModal');
    expect(title).toBeInTheDocument();
    expect(actions).toBeInTheDocument();
    expect(nominatorsList).toBeInTheDocument();
    expect(validatorsModal).toBeInTheDocument();
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

    const networkButton = screen.getByRole('button', { name: 'networkInfo' });
    await act(() => networkButton.click());

    const title = screen.getByText('inactiveChain');
    expect(title).toBeInTheDocument();
  });
});
