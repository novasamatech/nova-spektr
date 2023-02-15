import { render, screen } from '@testing-library/react';

import Block from './Block';

describe('ui/Block', () => {
  test('should render component', () => {
    const content = 'This is simple content';
    render(<Block>{content}</Block>);

    const children = screen.getByText(content);
    expect(children).toBeInTheDocument();
  });
});
