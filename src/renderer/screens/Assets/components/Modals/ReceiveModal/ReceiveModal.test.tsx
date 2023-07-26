import { render, screen, act } from '@testing-library/react';

import { Asset } from '@renderer/entities/asset';
import { TEST_ACCOUNT_ID } from '@renderer/shared/lib/utils';
import chains from '@renderer/assets/chains/chains.json';
import { useAccount } from '@renderer/entities/account';
import { SigningType } from '@renderer/domain/shared-kernel';
import { Chain } from '@renderer/entities/chain';
import { ReceiveModal } from './ReceiveModal';

jest.mock('@renderer/app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/entities/account', () => ({
  useAccount: jest.fn().mockReturnValue({
    getActiveAccounts: () => [{ name: 'Test Wallet', accountId: TEST_ACCOUNT_ID }],
  }),
  AccountAddress: ({ name, address }: { name?: string; address?: string }) => <span>{name || address}</span>,
}));

const westendExplorers = chains.find((chain) => chain.name === 'Westend')?.explorers || [];

describe('screens/Assets/ReceiveModal', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = (explorers?: any[]) => ({
    onClose: () => {},
    isOpen: true,
    asset: { name: 'WND', icon: 'wnd-icon' } as Asset,
    chain: {
      name: 'Westend',
      icon: 'westend-icon',
      explorers,
    } as Chain,
  });

  test('should render component', async () => {
    await act(async () => {
      render(<ReceiveModal {...defaultProps(westendExplorers)} />);
    });

    const title = screen.getByRole('dialog', { name: 'receive.title' });
    const address = screen.getByText('5CGQ7BPJZZKNirQgVhzbX9wdkgbnUHtJ5V7FkMXdZeVbXyr9');
    expect(title).toBeInTheDocument();
    expect(address).toBeInTheDocument();
  });

  test('should not render empty explorer links', async () => {
    await act(async () => {
      render(<ReceiveModal {...defaultProps()} />);
    });

    const explorers = screen.queryByRole('list');
    expect(explorers).not.toBeInTheDocument();
  });

  test('should not render select wallet component', async () => {
    await act(async () => {
      render(<ReceiveModal {...defaultProps(westendExplorers)} />);
    });

    const title = screen.queryByText('receive.selectWalletPlaceholder');
    expect(title).not.toBeInTheDocument();
  });

  test('should render select wallet component', async () => {
    (useAccount as jest.Mock).mockImplementation(() => ({
      getActiveAccounts: () => [
        { name: 'Test Wallet 1', accountId: TEST_ACCOUNT_ID, signingType: SigningType.PARITY_SIGNER },
        { name: 'Test Wallet 2', accountId: TEST_ACCOUNT_ID, signingType: SigningType.MULTISIG },
      ],
    }));

    await act(async () => {
      render(<ReceiveModal {...defaultProps(westendExplorers)} />);
    });

    const title = screen.getByRole('button', { name: /Test Wallet 1/ });
    expect(title).toBeInTheDocument();
  });
});
