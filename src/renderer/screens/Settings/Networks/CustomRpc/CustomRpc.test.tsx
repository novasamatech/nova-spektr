import { render, screen } from '@testing-library/react';

import CustomRpc from './CustomRpc';

describe('screens/Settings/Networks/CustomRpc', () => {
  test('should render component', () => {
    render(<CustomRpc isOpen onClose={() => {}} />);

    const text = screen.getByText('CustomRpc');
    expect(text).toBeInTheDocument();
  });
});
