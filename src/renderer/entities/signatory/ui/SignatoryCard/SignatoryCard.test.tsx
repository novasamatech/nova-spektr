import { render, screen } from '@testing-library/react';

import { TEST_ACCOUNT_ID } from '@shared/lib/utils';
import { SignatoryCard } from './SignatoryCard';

jest.mock('@app/providers', () => ({
  useMatrix: jest.fn().mockReturnValue({ matrix: { userId: 'some_id' } }),
}));

describe('ui/SignatoryCard', () => {
  test('should render component', () => {
    render(
      <SignatoryCard accountId={TEST_ACCOUNT_ID} addressPrefix={0} status={'SIGNED'}>
        <p>address</p>
      </SignatoryCard>,
    );

    const successIcon = screen.getByTestId('checkmarkOutline-svg');

    expect(successIcon).toHaveClass('text-text-positive');
  });
});
