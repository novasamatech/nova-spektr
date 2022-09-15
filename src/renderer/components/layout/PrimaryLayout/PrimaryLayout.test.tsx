import { render, screen } from '@testing-library/react';

import PrimaryLayout from './PrimaryLayout';

jest.mock('react-router-dom', () => ({ Outlet: () => 'outlet' }));
jest.mock('./Navigation/Navigation', () => () => 'navigation');

describe('layout/PrimaryLayout', () => {
  test('should render component', () => {
    render(<PrimaryLayout />);

    const navComponent = screen.getByText('navigation');
    const outletComponent = screen.getByText('outlet');
    expect(navComponent).toBeInTheDocument();
    expect(outletComponent).toBeInTheDocument();
  });
});
