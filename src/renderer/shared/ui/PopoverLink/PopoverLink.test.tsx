import { render, screen } from '@testing-library/react';

import PopoverLink from './PopoverLink';

describe('ui/PopoverLink', () => {
  test('should render component', () => {
    render(
      <PopoverLink iconName="novawallet" showIcon>
        My link
      </PopoverLink>,
    );

    const children = screen.getByText('My link');
    const icon = screen.queryByRole('img');
    expect(children).toBeInTheDocument();
    expect(icon).toBeInTheDocument();
  });

  test('should render without icon', () => {
    render(<PopoverLink>My link</PopoverLink>);

    const children = screen.getByText('My link');
    const icon = screen.queryByRole('img');
    expect(children).toBeInTheDocument();
    expect(icon).not.toBeInTheDocument();
  });
});
