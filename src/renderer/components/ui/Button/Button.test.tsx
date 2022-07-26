import { render, screen } from '@testing-library/react';

import Button, { ViewColor, ViewType } from './Button';

describe('Button', () => {
  test('should render component', () => {
    render(<Button view={[ViewType.Fill, ViewColor.Error]}>Hello button</Button>);

    const button = screen.getByRole('button', { name: 'Hello button' });
    expect(button).toBeInTheDocument();
  });
});
