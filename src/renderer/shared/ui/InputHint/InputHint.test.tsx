import { render, screen } from '@testing-library/react';

import { InputHint } from './InputHint';

describe('ui/InputHint', () => {
  test('should render component', () => {
    render(
      <InputHint active variant="hint">
        test hint
      </InputHint>,
    );

    const hint = screen.getByText('test hint');
    expect(hint).toBeInTheDocument();
    expect(hint).toHaveClass('text-text-tertiary');
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
