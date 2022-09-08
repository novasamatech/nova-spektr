import { render, screen } from '@testing-library/react';

import { HexString } from '@renderer/domain/shared-kernel';
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
      activeWallets: [
        {
          name: 'my wallet',
          publicKey: '0xd02b1de0e29d201d48f1a48fb0ead05bf292366ffe90efec9368bb2c7849de59' as HexString,
        },
      ],
    },
  };

  test('should render component', () => {
    render(<ReceiveModal {...defaultProps} />);

    const title = screen.getByRole('heading', { name: 'Receive' });
    expect(title).toBeInTheDocument();
  });
});
