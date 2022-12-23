import { act, render, screen } from '@testing-library/react';

import Filter from './Filter';

describe('ui/Dropdowns/Filter', () => {
  const options = [
    { id: '0', value: 'test_1', element: 'el_test_1' },
    { id: '1', value: 'test_2', element: 'el_test_2' },
    { id: '2', value: 'test_3', element: 'el_test_3' },
  ];

  const defaultProps = {
    activeIds: [],
    options,
    placeholder: 'Filters',
    onChange: () => {},
  };

  test('should render component', () => {
    render(<Filter {...defaultProps} />);

    const button = screen.getByRole('button');
    const placeholder = screen.getByText('Filters');
    expect(button).toBeInTheDocument();
    expect(placeholder).toBeInTheDocument();
  });

  test('should call onChange', async () => {
    const spyChange = jest.fn();
    render(<Filter {...defaultProps} onChange={spyChange} />);

    const button = screen.getByRole('button');
    await act(() => button.click());

    const optionOne = screen.getByRole('option', { name: options[0].element });
    await act(() => optionOne.click());
    expect(spyChange).toBeCalledWith([{ id: options[0].id, value: options[0].value }]);

    const optionTwo = screen.getByRole('option', { name: options[1].element });
    await act(() => optionTwo.click());
    expect(spyChange).toBeCalledWith([{ id: options[1].id, value: options[1].value }]);
  });

  test('should render list', async () => {
    render(<Filter {...defaultProps} />);

    const button = screen.getByRole('button');
    await act(() => button.click());

    const selectedOptions = screen.getAllByRole('option');
    expect(selectedOptions).toHaveLength(3);
  });
});
