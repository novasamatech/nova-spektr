import { render, screen, waitFor } from '@testing-library/react';

import { Loader } from './Loader';

describe('ui/Loader', () => {
  test('should render component', async () => {
    render(<Loader color="primary" />);

    await waitFor(() => expect(screen.getByText('loader.svg')).toBeInTheDocument());
  });

  test('should spin the loader', async () => {
    render(<Loader color="primary" />);

    await waitFor(() => expect(screen.getByText('loader.svg')).toHaveClass('animate-spin'));
  });
});
