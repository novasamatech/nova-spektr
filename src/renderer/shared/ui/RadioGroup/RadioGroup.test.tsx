import { act, render, screen } from '@testing-library/react';

import { RadioGroup } from './RadioGroup';

describe('ui/RadioGroup', () => {
  const options = [
    { id: '1', value: 1, title: 'Test 1' },
    { id: '2', value: 2, title: 'Test 2' },
  ];
  const defaultProps = {
    activeId: options[0].id,
    options,
    onChange: () => {},
  };

  test('should render component', () => {
    render(
      <RadioGroup {...defaultProps}>
        <RadioGroup.Option option={options[0]} />
        <RadioGroup.Option option={options[1]} />
      </RadioGroup>,
    );

    const items = screen.getAllByRole('radio');
    expect(items).toHaveLength(2);
  });

  test('should call onChange', async () => {
    const spyChange = jest.fn();
    render(
      <RadioGroup {...defaultProps} onChange={spyChange}>
        <RadioGroup.Option option={options[0]} />
        <RadioGroup.Option option={options[1]} />
      </RadioGroup>,
    );

    const item = screen.getByRole('radio', { checked: false });
    await act(async () => item.click());

    expect(spyChange).toBeCalledWith({ id: options[1].id, value: options[1].value });
  });

  test('should change active value', async () => {
    const { rerender } = render(
      <RadioGroup {...defaultProps}>
        <RadioGroup.Option option={options[0]} />
        <RadioGroup.Option option={options[1]} />
      </RadioGroup>,
    );

    let items = screen.getAllByRole('radio');
    expect(items[0]).toBeChecked();
    expect(items[1]).not.toBeChecked();

    rerender(
      <RadioGroup {...defaultProps} activeId={options[1].id}>
        <RadioGroup.Option option={options[0]} />
        <RadioGroup.Option option={options[1]} />
      </RadioGroup>,
    );

    items = screen.getAllByRole('radio');
    expect(items[0]).not.toBeChecked();
    expect(items[1]).toBeChecked();
  });
});
