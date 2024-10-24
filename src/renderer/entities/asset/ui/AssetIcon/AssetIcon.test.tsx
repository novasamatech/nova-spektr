import { act, render, screen } from '@testing-library/react';

import { TEST_CHAIN_ICON } from '@/shared/lib/utils';

import { AssetIcon } from './AssetIcon';

describe('ui/ChainIcon', () => {
  test('should render component', async () => {
    await act(async () => {
      render(<AssetIcon src={TEST_CHAIN_ICON} />);
    });

    const chainImage = screen.getByRole('img');
    expect(chainImage).toBeInTheDocument();
  });

  test('should not show img element if image not loaded', async () => {
    await act(async () => {
      render(<AssetIcon src={undefined} />);
    });

    const img = screen.getByRole('img');
    expect(img).toHaveClass('opacity-0');
  });
});
