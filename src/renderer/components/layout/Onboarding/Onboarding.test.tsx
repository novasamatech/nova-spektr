import { render, screen } from '@testing-library/react';

import Onboarding from './Onboarding';

jest.mock('@renderer/context/I18Context', () => ({
  useI18n: () => ({
    LocaleComponent: () => <div>localeComponent</div>,
  }),
}));

describe('Onboarding', () => {
  test('should render component', () => {
    render(<Onboarding />);

    const langSwitch = screen.getByText('localeComponent');
    expect(langSwitch).toBeInTheDocument();
  });
});
