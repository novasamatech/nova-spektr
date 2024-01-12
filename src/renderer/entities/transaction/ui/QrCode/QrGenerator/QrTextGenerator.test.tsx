import { render } from '@testing-library/react';

import { QrTextGenerator } from './QrTextGenerator';

describe('ui/QrTextGenerator', () => {
  test('should render text qr', () => {
    const { container } = render(<QrTextGenerator payload="my_payload" size={200} />);

    const svgQr = container.querySelector('svg');
    expect(svgQr).toBeInTheDocument();
  });
});
