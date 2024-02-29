import { render, screen } from '@testing-library/react';

import Header from './Header';

describe('components/common/Header', () => {
  test('should render component', () => {
    render(<Header title="My title">children</Header>);

    const text = screen.getByText('My title');
    const children = screen.getByText('children');
    expect(text).toBeInTheDocument();
    expect(children).toBeInTheDocument();
  });
});
