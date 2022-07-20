import { render, screen } from '@testing-library/react';

import Crowdloans from './Crowdloans';

describe('Crowdloans', () => {
  test('should render component', () => {
    render(<Crowdloans />);

    const text = screen.getByText('Crowdloans');
    expect(text).toBeInTheDocument();
  });
});
