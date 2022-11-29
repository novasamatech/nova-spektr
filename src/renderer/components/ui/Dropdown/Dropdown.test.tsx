import { act, render, screen } from '@testing-library/react';

import Dropdown from './Dropdown';

describe('ui/Dropdown', () => {
  const options = [
    { id: 0, element: 'label_0', value: '0' },
    { id: 1, element: 'label_1', value: '1' },
  ];

  test('should render component', () => {
    render(<Dropdown placeholder="Select option" options={options} onChange={() => {}} />);

    const button = screen.getByRole('button');
    const placeholder = screen.getByText('Select option');
    expect(button).toBeInTheDocument();
    expect(placeholder).toBeInTheDocument();
  });

  test('should call onSelected', async () => {
    const spySelected = jest.fn();
    render(<Dropdown placeholder="Select option" options={options} onChange={spySelected} />);

    const button = screen.getByRole('button');
    await act(() => button.click());

    const option = screen.getByRole('option', { name: options[0].element });
    await act(() => option.click());

    expect(spySelected).toBeCalledWith({ id: options[0].id, value: options[0].value });
  });
});
