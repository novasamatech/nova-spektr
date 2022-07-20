import { render, screen } from '@testing-library/react';

import Crowdloans from './Crowdloans';

describe('screen/Crowdloans', () => {
  test('should render component', () => {
    render(<Crowdloans />);

    const text = screen.getByText('Crowdloans');
    expect(text).toBeInTheDocument();
  });
});
