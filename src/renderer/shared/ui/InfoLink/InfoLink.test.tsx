import { render, screen } from '@testing-library/react';

import { InfoLink } from './InfoLink';

describe('pages/Settings/InfoLink', () => {
  test('should render component', () => {
    render(
      <InfoLink url="https://test.com" iconName="globe">
        My link
      </InfoLink>,
    );

    const children = screen.getByRole('link');
    const icon = screen.queryByRole('img');
    expect(children).toBeInTheDocument();
    expect(icon).toBeInTheDocument();
  });

  test('should render without icon', () => {
    render(<InfoLink url="https://test.com">My link</InfoLink>);

    const children = screen.getByRole('link', { name: 'My link' });
    const icon = screen.queryByRole('img');
    expect(children).toBeInTheDocument();
    expect(icon).not.toBeInTheDocument();
  });
});
