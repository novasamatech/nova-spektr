import { render, screen } from '@testing-library/react';

import InputHint from './InputHint';

describe('InputHint', () => {
  test('should render component', () => {
    render(
      <InputHint active variant="hint">
        test hint
      </InputHint>,
    );

    const hint = screen.getByText('test hint');
    expect(hint).toBeInTheDocument();
    expect(hint).toHaveClass('text-shade-40');
  });

  test('should not render component', () => {
    render(
      <InputHint active={false} variant="hint">
        test hint
      </InputHint>,
    );

    const hint = screen.queryByText('test hint');
    expect(hint).not.toBeInTheDocument();
  });
});
