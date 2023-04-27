import { render, screen } from '@testing-library/react';

import SignatoryCard from '@renderer/components/common/Signatory/SignatoryCard';
import { TEST_ADDRESS } from '@renderer/shared/utils/constants';

describe('ui/Signatory', () => {
  test('should render component', () => {
    const name = 'John Doe';
    render(<SignatoryCard address={TEST_ADDRESS} name={name} />);

    const nameElement = screen.getByText(name);

    expect(nameElement).toBeInTheDocument();
  });
});
