import { render, screen } from '@testing-library/react';

import ConfirmModal from './ConfirmModal';

describe('ui/Modals/ConfirmModal', () => {
  test('should render component', () => {
    render(
      <ConfirmModal isOpen onClose={() => {}} onConfirm={() => {}}>
        children
      </ConfirmModal>,
    );

    const cancel = screen.getByRole('button', { name: 'Cancel' });
    const confirm = screen.getByRole('button', { name: 'Confirm' });
    expect(cancel).toBeInTheDocument();
    expect(confirm).toBeInTheDocument();
  });
});
