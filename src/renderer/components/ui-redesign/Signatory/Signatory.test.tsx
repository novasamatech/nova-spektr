import { render, screen } from '@testing-library/react';

import Signatory from '@renderer/components/ui-redesign/Signatory/Signatory';
import { TEST_ADDRESS } from '@renderer/shared/utils/constants';

describe('ui/Signatory', () => {
  test('should render component', () => {
    const name = 'John Doe';
    render(<Signatory address={TEST_ADDRESS} name={name} />);

    const nameElement = screen.getByText(name);

    expect(nameElement).toBeInTheDocument();
  });
});
