import { render, screen } from '@testing-library/react';

import { Asset } from '@renderer/domain/asset';
import { Chain } from '@renderer/domain/chain';
import chains from '@renderer/services/network/common/chains/chains.json';
import ReceiveModal from './ReceiveModal';
import { TEST_ADDRESS, TEST_PUBLIC_KEY } from '@renderer/services/balance/common/constants';
import { useWallet } from '@renderer/services/wallet/walletService';

window.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
}));

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/services/wallet/walletService', () => ({
  useWallet: jest.fn().mockReturnValue({
    getActiveWallets: () => [
      {
        name: 'Test Wallet',
        mainAccounts: [
          {
            address: TEST_ADDRESS,
            publicKey: TEST_PUBLIC_KEY,
          },
        ],
      },
    ],
  }),
}));

const westendExplorers = chains.find((chain) => chain.name === 'Westend')?.explorers || [];

describe('screens/Balances/ReceiveModal', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = (explorers?: any[]) => ({
    onClose: () => {},
    isOpen: true,
    data: {
      chain: {
        name: 'Westend',
        icon: 'westend-icon',
        explorers,
      } as Chain,
      asset: { name: 'WND', icon: 'wnd-icon' } as Asset,
    },
  });

  test('should render component', () => {
    render(<ReceiveModal {...defaultProps(westendExplorers)} />);

    const title = screen.getByRole('heading', { name: 'receive.title' });
    const address = screen.getByText('5CGQ7BPJZZKNirQgVhzbX9wdkgbnUHtJ5V7FkMXdZeVbXyr9');
    expect(title).toBeInTheDocument();
    expect(address).toBeInTheDocument();
  });

  test('should not render empty explorer links', () => {
    render(<ReceiveModal {...defaultProps()} />);

    const explorers = screen.queryByRole('list');
    expect(explorers).not.toBeInTheDocument();
  });

  test('should not render select wallet component', () => {
    render(<ReceiveModal {...defaultProps(westendExplorers)} />);

    const title = screen.queryByText('receive.selectWalletPlaceholder');

    expect(title).not.toBeInTheDocument();
  });

  test('should render select wallet component', () => {
    (useWallet as unknown as jest.Mock).mockImplementation(() => ({
      getActiveWallets: () => [
        {
          name: 'Test Wallet',
          mainAccounts: [
            {
              address: TEST_ADDRESS,
              publicKey: TEST_PUBLIC_KEY,
            },
          ],
        },
        {
          name: 'Test Wallet 2',
          mainAccounts: [
            {
              address: TEST_ADDRESS,
              publicKey: TEST_PUBLIC_KEY,
            },
          ],
        },
      ],
    }));

    render(<ReceiveModal {...defaultProps(westendExplorers)} />);

    const title = screen.getByText('receive.selectWalletPlaceholder');

    expect(title).toBeInTheDocument();
  });
});
