import { render, screen } from '@testing-library/react';

import { StatusMark } from './StatusMark';

describe('ui/StatusMark', () => {
  test('should render component', () => {
    render(<StatusMark title="My label" subtitle="Subtitle" variant="success" />);

    const title = screen.getByText('My label');
    const subtitle = screen.getByText('Subtitle');

    expect(title).toBeInTheDocument();
    expect(subtitle).toBeInTheDocument();
  });
});
