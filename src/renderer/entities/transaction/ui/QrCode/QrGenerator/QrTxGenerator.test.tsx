import { u8aConcat, u8aToU8a } from '@polkadot/util';
import { decodeAddress } from '@polkadot/util-crypto';
import { render } from '@testing-library/react';

vi.mock('@/shared/i18n', () => ({
  useI18n: vi.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

import { QrTxGenerator } from './QrTxGenerator';
import { Command, SUBSTRATE_ID } from './common/constants';

describe('ui/QrTxGenerator', () => {
  test('should render transaction qr', () => {
    const payload = u8aConcat(
      SUBSTRATE_ID,
      new Uint8Array(1),
      new Uint8Array([Command.Transaction]),
      decodeAddress('5GmedEVixRJoE8TjMePLqz7DnnQG1d5517sXdiAvAF2t7EYW'),
      u8aToU8a('my_payload'),
      u8aToU8a('0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e'),
    );
    const { container } = render(<QrTxGenerator payload={payload} size="200px" enableRaptorQ={false} />);

    const svgQr = container.querySelector('svg');
    expect(svgQr).toBeInTheDocument();
  });
});
