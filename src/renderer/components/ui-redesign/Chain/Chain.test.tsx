import { act, render, screen } from '@testing-library/react';

import { Chain } from './Chain';
import { TEST_CHAIN_ID } from '@renderer/shared/utils/constants';

describe('screen/Operations/components/Chain', () => {
  test('should render component', async () => {
    await act(async () => {
      render(<Chain chainId={TEST_CHAIN_ID} />);
    });

    const title = screen.getByText('Polkadot');
    expect(title).toBeInTheDocument();
  });
});
