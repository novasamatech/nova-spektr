import { render, screen } from '@testing-library/react';

import ParitySignerQrReader from './ParitySignerQrReader';

jest.mock('@renderer/components/common', () => ({
  QrReader: () => 'qr_reader',
}));

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Onboarding/Parity/ParitySignerQrReader', () => {
  test('should render component', () => {
    render(<ParitySignerQrReader onResult={() => {}} onStart={() => {}} />);

    const qrReader = screen.getByText('qr_reader');
    expect(qrReader).toBeInTheDocument();
  });
});
