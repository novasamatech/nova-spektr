import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Welcome from './Welcome';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Onboarding/Welcome', () => {
  const renderComponent = () => render(<Welcome />, { wrapper: MemoryRouter });

  test('should render component', () => {
    renderComponent();

    const title = screen.getByRole('heading', { name: 'welcome.welcomeToLabel welcome.omniEnterpriseLabel' });
    expect(title).toBeInTheDocument();
  });

  test('should render 3 options with text', () => {
    renderComponent();

    const option1 = screen.getByText('welcome.addWatchOnlyLabel');
    const option2 = screen.getByText('welcome.addParitySignerLabel');
    const option3 = screen.getByText('welcome.addWatchOnlyLabel');
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
