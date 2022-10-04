import { act, render, screen } from '@testing-library/react';

import { ConfirmDialogProvider } from './ConfirmContext';

describe('context/MatrixContext', () => {
  test('should render children', async () => {
    await act(async () => {
      render(<ConfirmDialogProvider>children</ConfirmDialogProvider>);
    });

    expect(screen.getByText('children')).toBeInTheDocument();
  });
});
