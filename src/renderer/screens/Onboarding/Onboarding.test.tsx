import { render, screen } from '@testing-library/react';

import Onboarding from './Onboarding';

describe('Onboarding', () => {
  test('should render component', () => {
    render(<Onboarding />);

    const langSwitch = screen.getByRole('button', { name: 'Switch language' });
    expect(langSwitch).toBeInTheDocument();
  });
});
