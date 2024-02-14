import { act, render, screen } from '@testing-library/react';

import { ChainTitle } from './ChainTitle';
import { TEST_CHAIN_ID } from '@shared/lib/utils';

describe('ui/ChainTitle', () => {
  test('should render component', async () => {
    await act(async () => {
      render(<ChainTitle chainId={TEST_CHAIN_ID} />);
    });

    const title = screen.getByText('Polkadot');
    expect(title).toBeInTheDocument();

    const chainImage = screen.getByRole('img');
    expect(chainImage).toBeInTheDocument();
  });

  test('should not render title', async () => {
    await act(async () => {
      render(<ChainTitle chainId={TEST_CHAIN_ID} showChainName={false} />);
    });

    const title = screen.queryByText('Polkadot');
    expect(title).not.toBeInTheDocument();

    const chainImage = screen.getByRole('img');
    expect(chainImage).toBeInTheDocument();
  });
});
