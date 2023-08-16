import { render, screen } from '@testing-library/react';
import noop from 'lodash/noop';

import { ConfirmModal } from './ConfirmModal';

describe('ui/Modals/ConfirmModal', () => {
  const defaultProps = {
    isOpen: true,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onClose: noop,
    onConfirm: noop,
  };

  test('should render component', () => {
    render(<ConfirmModal {...defaultProps}>children</ConfirmModal>);

    const cancel = screen.getByRole('button', { name: 'Cancel' });
    const confirm = screen.getByRole('button', { name: 'Confirm' });
    expect(cancel).toBeInTheDocument();
    expect(confirm).toBeInTheDocument();
  });

  test('should render component with one button', () => {
    render(
      <ConfirmModal {...defaultProps} confirmText="">
        children
      </ConfirmModal>,
    );

    const cancel = screen.getByRole('button', { name: 'Cancel' });
    expect(cancel).toBeInTheDocument();
  });
});
