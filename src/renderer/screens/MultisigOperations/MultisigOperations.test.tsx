import { render, screen } from '@testing-library/react';

import MultisigOperations from './MultisigOperations';

describe('screen/MultisigOperations', () => {
  test('should render component', () => {
    render(<MultisigOperations />);

    const text = screen.getByText('MultisigOperations');
    expect(text).toBeInTheDocument();
  });
});
