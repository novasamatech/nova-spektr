import { act, render, screen } from '@testing-library/react';

import Radio from './Radio';

describe('Radio', () => {
  const options = [
    { id: 1, value: 1, element: <span>Test 1</span> },
    { id: 2, value: 2, element: <span>Test 2</span> },
  ];
  const defaultProps = {
    activeId: options[0].id,
    options,
    onChange: () => {},
  };

  test('should render component', () => {
    render(<Radio {...defaultProps} />);

    const items = screen.getAllByRole('radio');
    expect(items).toHaveLength(2);
  });

  test('should call onChange', async () => {
    const spyChange = jest.fn();
    render(<Radio {...defaultProps} onChange={spyChange} />);

    const item = screen.getByRole('radio', { checked: false });
    await act(async () => item.click());

    expect(spyChange).toBeCalledWith({ id: options[1].value, value: options[1].value });
  });

  test('should change active value', async () => {
    const { rerender } = render(<Radio {...defaultProps} />);

    let items = screen.getAllByRole('radio');
    expect(items[0]).toBeChecked();
    expect(items[1]).not.toBeChecked();

    rerender(<Radio {...defaultProps} activeId={options[1].id} />);

    items = screen.getAllByRole('radio');
    expect(items[0]).not.toBeChecked();
    expect(items[1]).toBeChecked();
  });
});
