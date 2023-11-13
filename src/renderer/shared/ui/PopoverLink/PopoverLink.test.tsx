import { render, screen } from '@testing-library/react';

import PopoverLink from './PopoverLink';

jest.mock('@app/providers', () => ({
  useMatrix: jest.fn(),
}));

describe('pages/Settings/PopoverLink', () => {
  test('should render component', () => {
    render(
      <PopoverLink iconName="globe" showIcon>
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
