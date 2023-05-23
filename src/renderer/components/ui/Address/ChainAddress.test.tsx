import { render, screen } from '@testing-library/react';

import ChainAddress from './ChainAddress';
import { TEST_ACCOUNT_ID, TEST_ADDRESS } from '@renderer/shared/utils/constants';

describe('ui/Address', () => {
  test('should render component', () => {
    render(<ChainAddress accountId={TEST_ACCOUNT_ID} addressPrefix={0} />);

    const addressValue = screen.getByText(TEST_ADDRESS);
    expect(addressValue).toBeInTheDocument();
  });

  test('should render short component', () => {
    render(<ChainAddress type="short" accountId={TEST_ACCOUNT_ID} />);

    const elipsis = screen.getByText('5CGQ7B...VbXyr9');
    expect(elipsis).toBeInTheDocument();
  });
});
