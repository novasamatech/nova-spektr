import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Vault from './Vault';

jest.mock('./StepOne/StepOne', () => () => 'step_1');
jest.mock('./StepTwo/StepTwo', () => () => 'step_2');
jest.mock('./StepThree/StepThree', () => () => 'step_3');
jest.mock('./StepThreeSingle/StepThreeSingle', () => () => 'step_3_single');

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Onboarding/Vault', () => {
  test('should render component', () => {
    render(<Vault isOpen={true} onClose={() => {}} onComplete={() => {}} />, { wrapper: MemoryRouter });

    const title = screen.getByRole('heading', { name: 'onboarding.vault.title' });

    expect(title).toBeInTheDocument();
  });
});
