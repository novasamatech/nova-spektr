import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Parity from './Parity';

jest.mock('./StepOne/StepOne', () => () => 'step_1');
jest.mock('./StepTwo/StepTwo', () => () => 'step_2');
jest.mock('./StepThree/StepThree', () => () => 'step_3');

describe('screens/Onboarding/Parity', () => {
  test('should render component', () => {
    render(<Parity />, { wrapper: MemoryRouter });

    const title = screen.getByRole('heading', { name: 'Add wallet by Parity Signer' });
    const stepOne = screen.getByText('step_1');

    expect(title).toBeInTheDocument();
    expect(stepOne).toBeInTheDocument();
  });
});
