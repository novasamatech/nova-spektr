import { render, screen } from '@testing-library/react';

import { TextBase } from './TextBase';

describe('shared/ui/Typography/TextBase', () => {
  it('should render text content', () => {
    render(<TextBase testId="text">Hello</TextBase>);

    expect(screen.getByTestId('text')).toHaveTextContent('Hello');
  });

  it('should render the number zero instead of swallowing it', () => {
    // A counter that legitimately reads zero must not disappear.
    render(<TextBase testId="text">{0}</TextBase>);

    expect(screen.getByTestId('text')).toHaveTextContent('0');
  });

  it('should skip NaN rather than printing it into a balance', () => {
    render(<TextBase testId="text">{Number.NaN}</TextBase>);

    expect(screen.queryByTestId('text')).not.toBeInTheDocument();
  });

  it('should render other numbers', () => {
    render(<TextBase testId="text">{42}</TextBase>);

    expect(screen.getByTestId('text')).toHaveTextContent('42');
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
    ['false', false],
  ])('should render nothing for %s', (_label, children) => {
    const { container } = render(<TextBase testId="text">{children}</TextBase>);

    expect(container).toBeEmptyDOMElement();
  });
});
