import { render, screen } from '@testing-library/react';

import Duration from './Duration';

describe('ui/Duration', () => {
  test('should render component', () => {
    render(<Duration seconds={'1'} />);

    const durationValue = screen.getByText('0:01');
    expect(durationValue).toBeInTheDocument();
  });
});
