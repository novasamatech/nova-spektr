import { act, render, renderHook, screen } from '@testing-library/react';

import useToggle from '@renderer/hooks/useToggle';
import { ConfirmDialogProvider, useConfirmContext } from './ConfirmContext';

jest.mock('@renderer/hooks/useToggle');

window.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
}));

describe('context/ConfirmContext', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render children', () => {
    (useToggle as jest.Mock).mockReturnValue([false, () => {}]);

    render(<ConfirmDialogProvider>children</ConfirmDialogProvider>);

    const children = screen.getByText('children');
    expect(children).toBeInTheDocument();
  });
});

describe('context/ConfirmContext/useConfirmContext', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should have defined functions', () => {
    (useToggle as jest.Mock).mockReturnValue([false, () => {}]);

    const { result } = renderHook(() => useConfirmContext(), { wrapper: ConfirmDialogProvider });

    expect(result.current).toBeDefined();
  });

  test('should close dialog', async () => {
    const spyToggle = jest.fn();
    (useToggle as jest.Mock).mockReturnValue([true, spyToggle]);

    const { result } = renderHook(() => useConfirmContext(), { wrapper: ConfirmDialogProvider });

    act(() => {
      result.current.confirm({
        title: 'test_title',
        message: 'test_label',
        confirmText: 'confirm',
        cancelText: 'cancel',
      });
    });

    const button = screen.getByRole('button', { name: 'cancel' });
    button.click();

    expect(spyToggle).toBeCalledTimes(2);
  });
});
