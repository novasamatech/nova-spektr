import { render, screen } from '@testing-library/react';

import Checkbox from './Checkbox';

describe('Checkbox', () => {
  test('should render component', () => {
    render(<Checkbox label="test label" />);

    const label = screen.getByText('test label');
    expect(label).toBeInTheDocument();
  });
});
