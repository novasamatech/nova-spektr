import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { useNetworkContext } from '@renderer/app/providers';
import { Chain } from '@renderer/entities/chain';
import { ConnectionType } from '@renderer/domain/connection';
import { TEST_ACCOUNT_ID } from '@renderer/shared/lib/utils';
import { Overview } from './Overview';

jest.mock('@renderer/app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
  useNetworkContext: jest.fn(() => ({
    connections: {},
  })),
  useGraphql: jest.fn(() => ({
    changeClient: jest.fn(),
  })),
}));

jest.mock('@renderer/entities/network', () => ({
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

jest.mock('@renderer/entities/account', () => ({
  useAccount: jest.fn().mockReturnValue({
    getActiveAccounts: () => [{ name: 'Test Wallet', accountId: TEST_ACCOUNT_ID }],
  }),
}));

jest.mock('@renderer/entities/staking', () => ({
  useValidators: jest.fn().mockReturnValue({
    getValidatorsWithInfo: jest.fn(),
  }),
  useEra: jest.fn().mockReturnValue({
    subscribeActiveEra: jest.fn(),
  }),
  useStakingRewards: jest.fn().mockReturnValue({
    rewards: {},
    isLoading: false,
  }),
  useStakingData: jest.fn().mockReturnValue({
    staking: {},
    subscribeLedger: jest.fn(),
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
