import { render, screen } from '@testing-library/react';

import { HexString } from '@renderer/domain/shared-kernel';
import { Asset } from '@renderer/domain/asset';
import { Chain } from '@renderer/domain/chain';
import chains from '@renderer/services/network/common/chains.json';
import ReceiveModal from './ReceiveModal';

window.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
}));

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

const westendExplorers = chains.find((chain) => chain.name === 'Westend')?.explorers || [];

describe('screens/Balances/ReceiveModal', () => {
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
      activeWallets: [
        {
          name: 'my wallet',
          publicKey: '0xd02b1de0e29d201d48f1a48fb0ead05bf292366ffe90efec9368bb2c7849de59' as HexString,
        },
      ],
    },
  });

  test('should render component', () => {
    render(<ReceiveModal {...defaultProps(westendExplorers)} />);

    const title = screen.getByRole('heading', { name: 'receive.title' });
    const address = screen.getByText('5GmedEVixRJoE8TjMePLqz7DnnQG1d5517sXdiAvAF2t7EYW');
    expect(title).toBeInTheDocument();
    expect(address).toBeInTheDocument();
  });

  test('should not render empty explorer links', () => {
    render(<ReceiveModal {...defaultProps()} />);

    const explorers = screen.queryByRole('list');
    expect(explorers).not.toBeInTheDocument();
  });
});
