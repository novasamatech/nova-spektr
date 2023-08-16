import { render, screen } from '@testing-library/react';

import Loader from './Loader';

describe('ui/Loader', () => {
  test('should render component', () => {
    render(<Loader color="primary" />);

    // const icon = screen.getByText('loader.svg'); TODO: add loader icon
    const icon = screen.getByTestId('refresh-svg');
    expect(icon).toBeInTheDocument();
  });

  test('should spin the loader', () => {
    render(<Loader color="primary" />);

    // const icon = screen.getByText('loader.svg'); TODO: add loader icon
    const icon = screen.getByTestId('refresh-svg');
    expect(icon).toHaveClass('animate-spin');
  });
});
