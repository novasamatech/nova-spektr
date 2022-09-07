import { render, screen } from '@testing-library/react';

import QrGenerator from './QrGenerator';

describe('QrGenerator', () => {
  test('should render component', () => {
    render(
      <QrGenerator
        cmd={3}
        address="5GmedEVixRJoE8TjMePLqz7DnnQG1d5517sXdiAvAF2t7EYW"
        genesisHash="0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e"
        payload="my_payload"
        size={200}
      />,
    );

    const qrCode = screen.getByRole('img');
    expect(qrCode).toBeInTheDocument();
    expect(qrCode).toHaveAttribute('src', expect.stringMatching(/^data:image\/gif;base64/));
  });
});
