import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { InputArea } from './InputArea';

describe('ui/Inputs/InputArea', () => {
  test('should render component', () => {
    render(<InputArea value="test input" />);

    const input = screen.getByDisplayValue('test input');
    expect(input).toBeInTheDocument();
  });

  test('should call onChange', async () => {
    const user = userEvent.setup();
    const spyChange = jest.fn();
    render(<InputArea onChange={spyChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'x');

    expect(spyChange).toBeCalledWith('x');
  });

  test('should respect maxLength', async () => {
    const user = userEvent.setup({ delay: null });
    render(<InputArea maxLength={10} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'this is my long text');

    expect(input).toHaveDisplayValue('this is my');
    expect(input).not.toHaveDisplayValue('this is my long text');
  });
});
