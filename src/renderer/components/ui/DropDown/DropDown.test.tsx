import { act, render, screen } from '@testing-library/react';

import DropDown from './DropDown';

describe('ui/DropDown', () => {
  const options = [
    { label: 'label_0', value: '0' },
    { label: 'label_1', value: '1' },
  ];

  test('should render component', () => {
    render(<DropDown placeholder="Select option" options={options} onSelected={() => {}} />);

    const button = screen.getByRole('button');
    const placeholder = screen.getByText('Select option');
    expect(button).toBeInTheDocument();
    expect(placeholder).toBeInTheDocument();
  });

  test('should call onSelected', async () => {
    const spySelected = jest.fn();
    render(<DropDown placeholder="Select option" options={options} onSelected={spySelected} />);

    const button = screen.getByRole('button');
    await act(() => button.click());

    const option = await screen.findByRole('option', { name: options[0].label });
    await act(() => option.click());

    expect(spySelected).toBeCalledWith(options[0]);
  });
});
