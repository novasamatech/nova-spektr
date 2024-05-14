import { render, screen } from '@testing-library/react';

import { IconButton } from './IconButton';

describe('ui/Buttons/ButtonBack', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render component', () => {
    render(<IconButton name="network" />);

    const children = screen.getByRole('button');
    expect(children).toBeInTheDocument();
  });
});
