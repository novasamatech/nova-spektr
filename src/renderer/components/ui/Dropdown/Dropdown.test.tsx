import { act, render, screen } from '@testing-library/react';

import Dropdown from './Dropdown';

describe('ui/Dropdown', () => {
  const options = [
    { element: 'label_0', value: '0' },
    { element: 'label_1', value: '1' },
  ];

  test('should render component', () => {
    render(<Dropdown placeholder="Select option" options={options} onSelected={() => {}} />);

    const button = screen.getByRole('button');
    const placeholder = screen.getByText('Select option');
    expect(button).toBeInTheDocument();
    expect(placeholder).toBeInTheDocument();
  });

  test('should call onSelected', async () => {
    const spySelected = jest.fn();
    render(<Dropdown placeholder="Select option" options={options} onSelected={spySelected} />);

    const button = screen.getByRole('button');
    await act(() => button.click());

    const option = await screen.findByRole('option', { name: options[0].element });
    await act(() => option.click());

    expect(spySelected).toBeCalledWith(options[0]);
  });
});
