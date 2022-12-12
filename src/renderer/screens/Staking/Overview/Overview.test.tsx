import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { StakingType } from '@renderer/domain/asset';
import { ConnectionType } from '@renderer/domain/connection';
import { TEST_ADDRESS, TEST_PUBLIC_KEY } from '@renderer/services/balance/common/constants';
import { Chain } from '@renderer/domain/chain';
import Overview from './Overview';

jest.mock('@renderer/context/NetworkContext', () => ({
  useNetworkContext: jest.fn(() => ({
    connections: {
      '0x123': {
        chainId: '0x123',
        assets: [{ assetId: '1', symbol: '1', staking: StakingType.RELAYCHAIN }],
        connection: {
          connectionType: ConnectionType.RPC_NODE,
        },
      },
    },
  })),
}));

jest.mock('@renderer/services/network/chainsService', () => ({
  useChains: jest.fn().mockReturnValue({
    getChainsData: jest.fn().mockReturnValue([
      {
        addressPrefix: 0,
        assets: [{ staking: 'relaychain' }],
        chainId: '0x00',
        name: 'My test chain',
      },
    ]),
    sortChains: (value: Chain[]) => value,
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

jest.mock('@renderer/services/staking/stakingService', () => ({
  useStaking: jest.fn().mockReturnValue({
    staking: [],
    getNominators: jest.fn(),
    getLedger: jest.fn(),
  }),
}));

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Staking/Overview', () => {
  test('should render component', async () => {
    await act(async () => {
      render(<Overview />, { wrapper: MemoryRouter });
    });

    const title = screen.getByText('staking.title');
    expect(title).toBeInTheDocument();
  });
});
