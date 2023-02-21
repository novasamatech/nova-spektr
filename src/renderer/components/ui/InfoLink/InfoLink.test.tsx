import { render, screen } from '@testing-library/react';

import InfoLink from './InfoLink';

describe('screen/Settings/InfoLink', () => {
  test('should render component', () => {
    render(<InfoLink url="https://test.com">My link</InfoLink>);

    const children = screen.getByRole('link', { name: 'globe.svg My link' });
    expect(children).toBeInTheDocument();
  });
});
