import { render, screen } from '@testing-library/react';

import Staking from './Staking';

describe('screen/Staking', () => {
  test('should render component', () => {
    render(<Staking />);

    const text = screen.getByText('Staking');
    expect(text).toBeInTheDocument();
  });
});
