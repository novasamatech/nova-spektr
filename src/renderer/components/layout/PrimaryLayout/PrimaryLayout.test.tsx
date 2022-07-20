import { render, screen } from '@testing-library/react';

import PrimaryLayout from '.';

jest.mock('react-router-dom', () => ({ Outlet: () => 'outlet' }));
jest.mock('./Navigation', () => () => 'navigation');
jest.mock('./Footer', () => () => 'footer');

describe('layout/PrimaryLayout', () => {
  test('should render component', () => {
    render(<PrimaryLayout />);

    const navComponent = screen.getByText('navigation');
    const footerComponent = screen.getByText('footer');
    const outletComponent = screen.getByText('outlet');
    expect(navComponent).toBeInTheDocument();
    expect(footerComponent).toBeInTheDocument();
    expect(outletComponent).toBeInTheDocument();
  });
});
