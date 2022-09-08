import { render, screen } from '@testing-library/react';

import { Asset } from '@renderer/domain/asset';
import { Chain } from '@renderer/domain/chain';
import chains from '@renderer/services/network/common/chains.json';
import ReceiveModal from './ReceiveModal';

const westendExplorers = chains.find((chain) => chain.name === 'Westend')?.explorers || [];

describe('ReceiveModal', () => {
  const defaultProps = {
    onClose: () => {},
    isOpen: true,
    data: {
      chain: {
        name: 'Westend',
        icon: 'westend-icon',
        explorers: westendExplorers,
      } as Chain,
      asset: { name: 'WND', icon: 'wnd-icon' } as Asset,
      activeWallets: [{ name: 'my wallet', address: '5GmedEVixRJoE8TjMePLqz7DnnQG1d5517sXdiAvAF2t7EYW' }],
    },
  };

  test('should render component', () => {
    render(<ReceiveModal {...defaultProps} />);

    const title = screen.getByRole('heading', { name: 'Receive' });
    expect(title).toBeInTheDocument();
  });
});
