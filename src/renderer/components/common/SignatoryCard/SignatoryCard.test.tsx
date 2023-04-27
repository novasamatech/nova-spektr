import { render, screen } from '@testing-library/react';

import { TEST_ADDRESS } from '@renderer/shared/utils/constants';
import SignatoryCard from './SignatoryCard';

describe('ui/Signatory', () => {
  test('should render component', () => {
    const name = 'John Doe';
    render(<SignatoryCard address={TEST_ADDRESS} name={name} />);

    const nameElement = screen.getByText(name);

    expect(nameElement).toBeInTheDocument();
  });
});
