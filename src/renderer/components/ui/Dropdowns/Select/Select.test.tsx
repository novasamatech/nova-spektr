import { act, render, screen } from '@testing-library/react';

import Select from './Select';

describe('ui/Select', () => {
  const options = [
    { id: 0, value: 'test_1', element: 'el_test_1' },
    { id: 1, value: 'test_2', element: 'el_test_2' },
    { id: 2, value: 'test_3', element: 'el_test_3' },
  ];

  const defaultProps = {
    activeIds: [],
    options,
    summary: 'Total',
    placeholder: 'Select option',
    onChange: () => {},
  };

  test('should render component', () => {
    render(<Select {...defaultProps} />);

    const button = screen.getByRole('button');
    const placeholder = screen.getByText('Select option');
    expect(button).toBeInTheDocument();
    expect(placeholder).toBeInTheDocument();
  });

  test('should call onChange', async () => {
    const spyChange = jest.fn();
    render(<Select {...defaultProps} onChange={spyChange} />);

    const button = screen.getByRole('button');
    await act(() => button.click());

    const optionOne = screen.getByRole('option', { name: options[0].element });
    await act(() => optionOne.click());
    expect(spyChange).toBeCalledWith([{ id: options[0].id, value: options[0].value }]);

    const optionTwo = screen.getByRole('option', { name: options[1].element });
    await act(() => optionTwo.click());
    expect(spyChange).toBeCalledWith([{ id: options[1].id, value: options[1].value }]);
  });

  test('should render summary options', () => {
    render(<Select {...defaultProps} activeIds={[options[1].id]} />);

    const summary = screen.getByRole('button');
    expect(summary).toHaveTextContent(/1Total/);
  });

  test('should render selected options', async () => {
    const { rerender } = render(<Select {...defaultProps} />);

    const button = screen.getByRole('button');
    await act(() => button.click());

    let selectedOption = screen.queryByRole('checkbox', { checked: true });
    expect(selectedOption).not.toBeInTheDocument();

    rerender(<Select {...defaultProps} activeIds={[options[1].id]} />);

    selectedOption = screen.getByRole('checkbox', { checked: true });
    expect(selectedOption).toBeInTheDocument();
  });
});
