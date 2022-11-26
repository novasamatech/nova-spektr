import { act, render, screen } from '@testing-library/react';

import Radio from './Radio';

describe('Radio', () => {
  const options = [
    { id: 1, value: 1, element: <span>Test 1</span> },
    { id: 2, value: 2, element: <span>Test 2</span> },
  ];

  test('should render component', () => {
    render(<Radio selected={options[0].value} options={options} onChange={() => {}} />);

    const items = screen.getAllByRole('radio');
    expect(items).toHaveLength(2);
  });

  test('should change selected', async () => {
    const spyChange = jest.fn();
    const { rerender } = render(<Radio selected={options[0].value} options={options} onChange={spyChange} />);

    const item = screen.getByRole('radio', { checked: false });
    await act(async () => item.click());

    rerender(<Radio selected={options[1].value} options={options} onChange={spyChange} />);

    const itemSelected = screen.getByRole('radio', { checked: true });
    expect(itemSelected).toHaveTextContent('Test 2');
    expect(spyChange).toBeCalledWith(options[1].value);
  });
});
