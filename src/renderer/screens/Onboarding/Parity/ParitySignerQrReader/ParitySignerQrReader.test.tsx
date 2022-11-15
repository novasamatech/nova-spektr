import { act, render, screen, waitFor } from '@testing-library/react';

import { QrReader } from '@renderer/components/common';
import { QrError, VideoInput } from '@renderer/components/common/QrCode/QrReader/common/types';
import { Button, Dropdown } from '@renderer/components/ui';
import ParitySignerQrReader from './ParitySignerQrReader';

jest.mock('@renderer/components/common');
jest.mock('@renderer/components/ui');

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Onboarding/Parity/ParitySignerQrReader', () => {
  describe('success state', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should render component', () => {
      (QrReader as jest.Mock).mockImplementation(() => 'qr_reader');

      render(<ParitySignerQrReader onResult={() => {}} />);

      const qrReader = screen.getByText('qr_reader');
      const loading = screen.getByText('onboarding.paritySigner.startCameraLabel');
      expect(qrReader).toBeInTheDocument();
      expect(loading).toBeInTheDocument();
    });

    test('should render select camera', () => {
      const cameras = [
        { id: '1', label: 'Camera 1' },
        { id: '2', label: 'Camera 2' },
      ];
      (QrReader as jest.Mock).mockImplementation(({ onCameraList }: any) => (
        <button type="button" onClick={() => onCameraList(cameras)}>
          qrReader
        </button>
      ));
      (Dropdown as jest.Mock).mockImplementation(({ options }: any) =>
        options.map((o: VideoInput) => <span key="1">{o.label}</span>),
      );

      render(<ParitySignerQrReader onResult={() => {}} />);
      const qrButton = screen.getByRole('button');

      act(() => qrButton.click());

      const label = screen.getByText('onboarding.paritySigner.multipleCamerasLabel');
      expect(label).toBeInTheDocument();

      cameras.forEach((camera, index) => {
        const el = screen.getByText(`${index + 1}. ${camera.label}`);
        expect(el).toBeInTheDocument();
      });
    });

    test('should render complete state', () => {
      (QrReader as jest.Mock).mockImplementation(({ onResult }: any) => (
        <button type="button" onClick={() => onResult('result')}>
          qrReader
        </button>
      ));

      render(<ParitySignerQrReader onResult={() => {}} />);

      const checkmarkBefore = screen.queryByTestId('checkmarkCutout-svg');
      expect(checkmarkBefore).not.toBeInTheDocument();

      const qrButton = screen.getByRole('button');
      act(() => qrButton.click());

      waitFor(() => {
        const checkmarkAfter = screen.getByTestId('checkmarkCutout-svg');
        expect(checkmarkAfter).toBeInTheDocument();
      });
    });

    test('should render decoded progress', () => {
      (QrReader as jest.Mock).mockImplementation(({ onProgress }: any) => (
        <button type="button" onClick={() => onProgress({ decoded: 3, total: 4 })}>
          qrReader
        </button>
      ));

      render(<ParitySignerQrReader onResult={() => {}} />);

      const qrButton = screen.getByRole('button');
      act(() => qrButton.click());

      const progress = screen.getByTestId('progress');
      expect(progress).toHaveTextContent('3 / 4');
    });
  });

  describe('error state', () => {
    const renderWithError = (errorCode: QrError) => {
      (QrReader as jest.Mock).mockImplementation(({ onError }: any) => (
        <button type="button" onClick={() => onError({ code: errorCode })}>
          qrReader
        </button>
      ));

      render(<ParitySignerQrReader onResult={() => {}} />);

      const qrButton = screen.getByRole('button');
      act(() => qrButton.click());
    };

    beforeAll(() => {
      (Button as jest.Mock).mockImplementation(({ children }: any) => <button type="button">{children}</button>);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should render invalid error', () => {
      const badKey = { multiSigner: { public: '0x123' } };
      (QrReader as jest.Mock).mockImplementation(({ onResult }: any) => (
        <button type="button" onClick={() => onResult(badKey)}>
          qrReader
        </button>
      ));

      render(<ParitySignerQrReader onResult={() => {}} />);

      const qrButton = screen.getByRole('button');
      act(() => qrButton.click());

      const invalidError = screen.getByText('onboarding.paritySigner.wrongQRCodeLabel');
      const scanButton = screen.getByText('onboarding.paritySigner.scanAgainButton');
      expect(invalidError).toBeInTheDocument();
      expect(scanButton).toBeInTheDocument();
    });

    test('should render unknown error', () => {
      renderWithError(QrError.FRAME_METADATA);

      const invalidError = screen.getByText('onboarding.paritySigner.notWorkingLabel');
      const retryButton = screen.getByText('onboarding.paritySigner.tryAgainButton');
      expect(invalidError).toBeInTheDocument();
      expect(retryButton).toBeInTheDocument();
    });

    test('should render decode error', () => {
      renderWithError(QrError.DECODE_ERROR);

      const invalidError = screen.getByText('onboarding.paritySigner.decodeErrorLabel');
      const retryButton = screen.getByText('onboarding.paritySigner.tryAgainButton');
      expect(invalidError).toBeInTheDocument();
      expect(retryButton).toBeInTheDocument();
    });

    test('should render deny error', () => {
      renderWithError(QrError.USER_DENY);

      const invalidError = screen.getByText('onboarding.paritySigner.accessDeniedLabel');
      const retryButton = screen.getByText('onboarding.paritySigner.tryAgainButton');
      expect(invalidError).toBeInTheDocument();
      expect(retryButton).toBeInTheDocument();
    });
  });
});
