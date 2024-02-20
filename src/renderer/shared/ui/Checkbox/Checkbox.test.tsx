import { render, screen } from '@testing-library/react';

import { Checkbox } from './Checkbox';

describe('ui/Checkbox', () => {
  test('should render component', () => {
    render(<Checkbox>test label</Checkbox>);

    const label = screen.getByText('test label');
    expect(label).toBeInTheDocument();
  });

  test('should toggle check state', () => {
    let isChecked = false;
    const toggleCheck = jest.fn().mockImplementation(() => {
      isChecked = !isChecked;
    });

    const { rerender } = render(
      <Checkbox checked={isChecked} onChange={toggleCheck}>
        test label
      </Checkbox>,
    );

    let input = screen.getByRole('checkbox');
    expect(input).not.toBeChecked();

    input.click();

    rerender(<Checkbox checked={isChecked}>test label</Checkbox>);

    input = screen.getByRole('checkbox');
    expect(input).toBeChecked();
    expect(toggleCheck).toBeCalled();
    expect(isChecked).toEqual(true);
  });
});
