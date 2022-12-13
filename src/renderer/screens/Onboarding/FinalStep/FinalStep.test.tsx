import { render, screen } from '@testing-library/react';

import FinalStep from './FinalStep';
import { SigningType } from '@renderer/domain/shared-kernel';

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

// TODO: add more tests
describe('screens/Onboard/FinalStep', () => {
  test('should render Watch Only component', () => {
    render(<FinalStep signingType={SigningType.WATCH_ONLY} />);

    const title = screen.getByText('onboarding.readyToUseLabel');
    expect(title).toBeInTheDocument();
  });
});
