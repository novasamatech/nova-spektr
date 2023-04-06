import { render, screen } from '@testing-library/react';

import { Asset } from '@renderer/domain/asset';
import { Chain } from '@renderer/domain/chain';
import { TEST_ADDRESS, TEST_PUBLIC_KEY } from '@renderer/shared/utils/constants';
import chains from '@renderer/services/network/common/chains/chains.json';
import ReceiveModal from './ReceiveModal';
import { useAccount } from '@renderer/services/account/accountService';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
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
    (useAccount as jest.Mock).mockImplementation(() => ({
      getActiveAccounts: () => [
        {
          name: 'Test Wallet 1',
          accountId: TEST_ADDRESS,
          publicKey: TEST_PUBLIC_KEY,
        },
        {
          name: 'Test Wallet 2',
          accountId: TEST_ADDRESS,
          publicKey: TEST_PUBLIC_KEY,
        },
      ],
    }));

    render(<ReceiveModal {...defaultProps(westendExplorers)} />);

    const title = screen.getByRole('button', { name: /Test Wallet 1/ });
    expect(title).toBeInTheDocument();
  });
});
