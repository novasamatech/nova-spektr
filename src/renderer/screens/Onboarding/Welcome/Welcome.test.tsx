import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Welcome from './Welcome';

describe('screens/Onboarding/Welcome', () => {
  const renderComponent = () => render(<Welcome />, { wrapper: MemoryRouter });

  test('should render component', () => {
    renderComponent();

    const title = screen.getByRole('heading', { name: 'Welcome to Omni Enterprise' });
    expect(title).toBeInTheDocument();
  });

  test('should render 3 options with text', () => {
    renderComponent();

    const option1 = screen.getByText(/Track the activity of any wallet/);
    const option2 = screen.getByText(/Use dedicated hardware wallet/);
    const option3 = screen.getByText(/Ledger's the smartest way to secure/);
    [option1, option2, option3].forEach((option) => expect(option).toBeInTheDocument());
  });

  test('should render 3 options with 2 active links', () => {
    renderComponent();

    const options = screen.getAllByRole('listitem');
    const activeLinks = screen.getAllByRole('link');

    expect(options).toHaveLength(3);
    expect(activeLinks).toHaveLength(2);
  });
});
