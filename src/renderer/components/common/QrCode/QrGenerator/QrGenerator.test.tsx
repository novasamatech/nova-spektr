import { render, screen } from '@testing-library/react';

import { QrTextGenerator, QrTxGenerator } from './QrGenerator';

describe('QrTxGenerator', () => {
  test('should render transaction qr', () => {
    render(
      <QrTxGenerator
        cmd={3}
        address="5GmedEVixRJoE8TjMePLqz7DnnQG1d5517sXdiAvAF2t7EYW"
        genesisHash="0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e"
        payload="my_payload"
        size={200}
      />,
    );

    const qrCode = screen.getByTestId('qr-tx');
    expect(qrCode).toBeInTheDocument();
  });
});

describe('QrTextGenerator', () => {
  test('should render text qr', () => {
    render(<QrTextGenerator payload="my_payload" size={200} />);

    const qrCode = screen.getByTestId('qr-text');
    expect(qrCode).toBeInTheDocument();
  });
});
