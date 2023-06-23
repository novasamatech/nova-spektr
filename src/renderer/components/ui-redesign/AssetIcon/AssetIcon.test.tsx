import { act, render, screen } from '@testing-library/react';

import { AssetIcon } from './AssetIcon';
import { TEST_CHAIN_ICON } from '@renderer/shared/utils/constants';

describe('ui-redesign/ChainIcon', () => {
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
    expect(img).toHaveClass('invisible');
  });
});
