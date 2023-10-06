import { render, screen } from '@testing-library/react';

import { TEST_ADDRESS } from '@renderer/shared/lib/utils';
import { SignatoryCard } from './SignatoryCard';

jest.mock('@renderer/app/providers', () => ({
  useMatrix: jest.fn().mockReturnValue({ matrix: { userId: 'some_id' } }),
}));

describe('ui/SignatoryCard', () => {
  test('should render component', () => {
    const name = 'John Doe';
    render(<SignatoryCard address={TEST_ADDRESS} name={name} />);

    const nameElement = screen.getByText(name);

    expect(nameElement).toBeInTheDocument();
  });
});
