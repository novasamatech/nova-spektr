import { render } from '@testing-library/react';

import { CryptoType, SigningType } from '@/shared/core';

import { QrTxGenerator } from './QrTxGenerator';

describe('ui/QrTxGenerator', () => {
  test('should render transaction qr', () => {
    const { container } = render(
      <QrTxGenerator
        address="5GmedEVixRJoE8TjMePLqz7DnnQG1d5517sXdiAvAF2t7EYW"
        signingType={SigningType.WALLET_CONNECT}
        cryptoType={CryptoType.SR25519}
        genesisHash="0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e"
        payload="my_payload"
        size={200}
      />,
    );

    const svgQr = container.querySelector('svg');
    expect(svgQr).toBeInTheDocument();
  });
});
