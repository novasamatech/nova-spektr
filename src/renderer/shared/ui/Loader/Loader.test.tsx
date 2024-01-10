import { render, screen } from '@testing-library/react';

import Loader from './Loader';

jest.mock('@app/providers', () => ({
  useMatrix: jest.fn(),
}));

describe('ui/Loader', () => {
  test('should render component', () => {
    render(<Loader color="primary" />);

    const icon = screen.getByText('loader.svg');
    expect(icon).toBeInTheDocument();
  });

  test('should spin the loader', () => {
    render(<Loader color="primary" />);

    const icon = screen.getByText('loader.svg');
    expect(icon).toHaveClass('animate-spin');
  });
});
