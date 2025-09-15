import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { RadioGroup } from './RadioGroup';

describe('RadioGroup', () => {
  test('should render and handle selection', async () => {
    const user = userEvent.setup();
    const spyChange = jest.fn();

    const option1 = { id: '1', value: 'option1', title: 'Option 1' };
    const option2 = { id: '2', value: 'option2', title: 'Option 2' };

    render(
      <RadioGroup value="option1" onChange={spyChange}>
        <RadioGroup.Option option={option1} />
        <RadioGroup.Option option={option2} />
      </RadioGroup>,
    );

    const option2Element = screen.getByText('Option 2');
    await user.click(option2Element);

    expect(spyChange).toHaveBeenCalledWith('option2');
  });

  test('should render CardOption', () => {
    const cardOption = { id: '1', value: 'option1', title: 'Option 1', description: 'Description 1' };
    render(
      <RadioGroup value="option1" onChange={() => {}}>
        <RadioGroup.CardOption option={cardOption} />
      </RadioGroup>,
    );

    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Description 1')).toBeInTheDocument();
  });

  test('should handle disabled state', () => {
    const option = { id: '1', value: 'option1', title: 'Option 1' };

    render(
      <RadioGroup disabled value="option1" onChange={() => {}}>
        <RadioGroup.Option option={option} />
      </RadioGroup>,
    );

    const radioButton = screen.getByRole('radio');
    expect(radioButton).toBeDisabled();
  });
});
