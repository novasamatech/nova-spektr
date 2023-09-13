import { act, render, screen } from '@testing-library/react';

import { ChainTitle } from './ChainTitle';
import { TEST_CHAIN_ID } from '@renderer/shared/lib/utils';

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
});
