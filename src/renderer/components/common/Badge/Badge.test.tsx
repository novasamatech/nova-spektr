import { screen, render } from '@testing-library/react';

import Badge from './Badge';

describe('common/Badge/Badge', () => {
  test('should render component', () => {
    render(
      <Badge titleText="Popover title" content="Popover text" pallet="error">
        Hello badge
      </Badge>,
    );

    const text = screen.getByText('Hello badge');
    expect(text).toBeInTheDocument();
  });
});
