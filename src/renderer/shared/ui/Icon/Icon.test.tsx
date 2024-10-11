import { render, screen, waitFor } from '@testing-library/react';

import { Icon } from './Icon';

describe('ui/Icon', () => {
  test('should render svg component', async () => {
    render(<Icon name="copy" />);

    await waitFor(() => expect(screen.getByTestId('copy-svg')).toBeInTheDocument());
  });

  test('should render img component', async () => {
    render(<Icon as="img" name="copy" />);

    await waitFor(() => expect(screen.getByTestId('copy-img')).toBeInTheDocument());
  });
});
