import { render, screen } from '@testing-library/react';

import InputHint from './InputHint';

describe('InputError', () => {
  test('should render component', () => {
    render(<InputHint type="hint">test hint</InputHint>);

    const hint = screen.getByText('test hint');
    expect(hint).toBeInTheDocument();
    expect(hint).toHaveClass('text-shade-40');
  });
});
