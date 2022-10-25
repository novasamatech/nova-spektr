import { act, render, screen } from '@testing-library/react';

import { QrReader } from '@renderer/components/common';
import ParitySignerQrReader from './ParitySignerQrReader';

jest.mock('@renderer/components/common');

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Onboarding/Parity/ParitySignerQrReader', () => {
  test('should render component', () => {
    (QrReader as jest.Mock).mockImplementation(() => 'qr_reader');

    render(<ParitySignerQrReader onResult={() => {}} onStart={() => {}} />);

    const qrReader = screen.getByText('qr_reader');
    expect(qrReader).toBeInTheDocument();
  });

  test('should render complete state', () => {
    (QrReader as jest.Mock).mockImplementation(({ onResult }: any) => (
      <button type="button" onClick={() => onResult('result')}>
        qrReader
      </button>
    ));

    render(<ParitySignerQrReader onResult={() => {}} onStart={() => {}} />);

    const checkmarkBefore = screen.queryByTestId('checkmarkCutout-svg');
    expect(checkmarkBefore).not.toBeInTheDocument();

    const qrButton = screen.getByRole('button');
    act(() => qrButton.click());

    const checkmarkAfter = screen.getByTestId('checkmarkCutout-svg');
    expect(checkmarkAfter).toBeInTheDocument();
  });

  test('should render decoded progress', () => {
    (QrReader as jest.Mock).mockImplementation(({ onProgress }: any) => (
      <button type="button" onClick={() => onProgress({ decoded: 3, total: 4 })}>
        qrReader
      </button>
    ));

    render(<ParitySignerQrReader onResult={() => {}} onStart={() => {}} />);

    const qrButton = screen.getByRole('button');
    act(() => qrButton.click());

    const progress = screen.getByTestId('progress');
    expect(progress).toHaveTextContent('3 / 4');
  });
});
