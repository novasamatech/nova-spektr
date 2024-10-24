import { act, render, screen } from '@testing-library/react';

import { TEST_CHAIN_ICON } from '@/shared/lib/utils';

import { ChainIcon } from './ChainIcon';

describe('ui/ChainIcon', () => {
  test('should render component', async () => {
    await act(async () => {
      render(<ChainIcon src={TEST_CHAIN_ICON} />);
    });

    const chainImage = screen.getByRole('img');
    expect(chainImage).toBeInTheDocument();
  });

  // TODO fix test
  // test('should render shimmer if image not loaded', async () => {
  //   await act(async () => {
  //     render(<ChainIcon icon={null} />);
  //   });
  //
  //   const shimmer = await screen.findByTestId('shimmer');
  //   expect(shimmer).toBeInTheDocument();
  // });
});
