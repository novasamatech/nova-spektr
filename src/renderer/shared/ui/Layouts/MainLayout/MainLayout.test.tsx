import { render, screen } from '@testing-library/react';

import { MainLayout } from './MainLayout';

jest.mock('react-router-dom', () => ({ Outlet: () => 'outlet' }));

describe('shared/ui/Layouts/MainLayout', () => {
  test('should render component', () => {
    render(<MainLayout>children</MainLayout>);

    const children = screen.getByText('children');
    const outletComponent = screen.getByText('outlet');
    expect(children).toBeInTheDocument();
    expect(outletComponent).toBeInTheDocument();
  });
});
