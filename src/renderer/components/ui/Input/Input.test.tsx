import { render, screen } from '@testing-library/react';

import Input from './Input';

describe('Input', () => {
  test('should render component', () => {
    render(<Input value="test input" onChange={() => {}} />);

    const input = screen.getByDisplayValue('test input');
    expect(input).toBeInTheDocument();
  });
});
