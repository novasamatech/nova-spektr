import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { InputFile } from './InputFile';

describe('ui/Inputs/InputFile', () => {
  test('should render component', () => {
    render(<InputFile placeholder="file input" />);

    const placeholder = screen.getByText('file input');
    const input = screen.getByTestId('file-input');
    expect(placeholder).toBeInTheDocument();
    expect(input).toBeInTheDocument();
  });

  test('should call onChange', async () => {
    const file = new File(['hello'], 'hello.png', { type: 'image/png' });

    const user = userEvent.setup();
    const spyChange = jest.fn();
    render(<InputFile placeholder="file input" onChange={spyChange} />);

    const input = screen.getByTestId('file-input') as HTMLInputElement;
    await user.upload(input, file);

    expect(input.files?.[0]).toStrictEqual(file);
    expect(input.files?.item(0)).toStrictEqual(file);
    expect(input.files).toHaveLength(1);
  });
});
