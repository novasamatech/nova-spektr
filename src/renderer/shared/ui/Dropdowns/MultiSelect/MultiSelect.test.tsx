import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import { MultiSelect } from './MultiSelect';

vi.mock('@/shared/i18n', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('ui/Dropdowns/MultiSelect', () => {
  const options = [
    { id: '0', element: 'label_0', value: '0' },
    { id: '1', element: 'label_1', value: '1' },
  ];
  const defaultProps = {
    activeId: undefined,
    placeholder: 'Select option',
    onChange: () => {},
    options,
  };

  test('should render component', () => {
    render(<MultiSelect {...defaultProps} />);

    const button = screen.getByRole('button');
    const placeholder = screen.getByText('Select option');
    expect(button).toBeInTheDocument();
    expect(placeholder).toBeInTheDocument();
  });

  test('should open dropdown and show options on click', async () => {
    render(<MultiSelect {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const option = screen.getByRole('option', { name: options[0]!.element });
    expect(option).toBeInTheDocument();
  });

  test('should show search input when onSearch is provided', async () => {
    const spySearch = jest.fn();
    render(<MultiSelect {...defaultProps} onSearch={spySearch} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    const option = screen.getByRole('option', { name: options[0]!.element });
    expect(option).toBeInTheDocument();
  });

  test('should call onSelected when option is clicked', async () => {
    const spySelected = jest.fn();
    render(<MultiSelect {...defaultProps} onChange={spySelected} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const option = screen.getByRole('option', { name: options[0]!.element });
    fireEvent.click(option);

    expect(spySelected).toHaveBeenCalledWith([{ id: options[0]!.id, value: options[0]!.value }]);
  });
});
