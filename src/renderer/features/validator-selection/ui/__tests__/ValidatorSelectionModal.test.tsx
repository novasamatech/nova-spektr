import { render, screen } from '@testing-library/react';
import { fork } from 'effector';
import { Provider } from 'effector-react';

import { I18Provider } from '@/shared/i18n';
import { ThemeProvider } from '@/shared/ui-kit';
import { ValidatorSelectionModal } from '../ValidatorSelectionModal';

const renderModal = () => {
  const scope = fork();

  return render(
    <Provider value={scope}>
      <I18Provider>
        <ThemeProvider>
          <ValidatorSelectionModal isOpen onClose={() => {}} />
        </ThemeProvider>
      </I18Provider>
    </Provider>,
  );
};

describe('features/validator-selection/ui/ValidatorSelectionModal', () => {
  test('should render the chrome around an empty, still loading table', async () => {
    renderModal();

    expect(await screen.findByText('Change nominations')).toBeInTheDocument();
    expect(await screen.findByPlaceholderText('Search name or address')).toBeInTheDocument();
    expect(await screen.findByText('Fill with recommended')).toBeInTheDocument();
    expect(await screen.findByText('Validator')).toBeInTheDocument();
    expect(await screen.findByText('APY')).toBeInTheDocument();
  });

  test('should keep the picker read-only until a validator is chosen', async () => {
    renderModal();

    expect(await screen.findByText('Pick a validator from the list to see its numbers.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Continue' })).toBeDisabled();
  });
});
