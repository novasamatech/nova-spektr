import { render, screen } from '@testing-library/react';

import Identicon from './Identicon';

describe('ui/Identicon', () => {
  test('should render component', () => {
    const address = '5DXYNRXmNmFLFxxUjMXSzKh3vqHRDfDGGbY3BnSdQcta1SkX';
    render(<Identicon address={address} />);

    const text = screen.getByTestId(`identicon-${address}`);
    expect(text).toBeInTheDocument();
  });
});
