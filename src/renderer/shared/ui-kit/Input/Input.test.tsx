import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { Input } from './Input';

describe('ui/Inputs/Input', () => {
  test('should render component', () => {
    render(<Input value="test input" onChange={() => {}} />);

    const input = screen.getByDisplayValue('test input');
    expect(input).toBeInTheDocument();
  });

  test('should call onChange', async () => {
    const user = userEvent.setup();
    const spyChange = jest.fn();
    render(<Input onChange={spyChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'x');

    expect(spyChange).toHaveBeenCalledWith('x');
  });
});
