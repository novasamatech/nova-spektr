import { act, render, screen } from '@testing-library/react';
import { BrowserCodeReader, BrowserQRCodeReader } from '@zxing/browser';
import { vi } from 'vitest';

import { QR_READER_ERRORS } from '../common/errors';
import { QrError } from '../common/types';

import { QrReader } from './QrReader';

const spyStop = jest.fn();
const spyTrackStop = jest.fn();

vi.mock('@zxing/browser', () => ({
  BrowserCodeReader: {
    listVideoInputDevices: jest.fn().mockResolvedValue([{ deviceId: '123', label: 'my_device' }]),
  },
  BrowserQRCodeReader: jest.fn().mockImplementation(() => ({
    decodeFromVideoDevice: jest.fn().mockResolvedValue({
      stop: spyStop,
    }),
  })),
}));

vi.mock('@/shared/i18n', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('ui/QrCode/QrReader', () => {
  const mockUserMedia = () => {
    const mediaValue = {
      getUserMedia: jest.fn().mockResolvedValue({
        getVideoTracks: jest.fn().mockReturnValue([{ stop: spyTrackStop }]),
      }),
    };

    Object.defineProperty(window.navigator, 'mediaDevices', { writable: true, value: mediaValue });
  };

  afterEach(() => {
    Object.defineProperty(window.navigator, 'mediaDevices', { writable: true, value: undefined });

    jest.clearAllMocks();
  });

  test('should render component', () => {
    render(<QrReader onResult={() => {}} />);

    const video = screen.getByTestId('qr-reader');
    expect(video).toBeInTheDocument();
  });

  test('should clean on unmount', async () => {
    mockUserMedia();

    let unmount = () => {};
    await act(async () => {
      const callbacks = render(<QrReader onResult={() => {}} />);
      unmount = callbacks.unmount;
    });

    unmount();

    expect(spyStop).toBeCalledTimes(1);
    expect(spyTrackStop).toBeCalledTimes(1);
  });

  test('should successfully start camera with 1 camera', async () => {
    const spyError = jest.fn();
    const spyStart = jest.fn();
    const spyCameraList = jest.fn();
    mockUserMedia();

    await act(async () => {
      render(<QrReader onStart={spyStart} onResult={() => {}} onError={spyError} onCameraList={spyCameraList} />);
    });

    expect(spyStart).toBeCalledTimes(1);
    expect(spyError).not.toHaveBeenCalled();
    expect(spyCameraList).not.toHaveBeenCalled();
  });

  test('should throw error on camera start', async () => {
    const spyError = jest.fn();
    const spyStart = jest.fn();

    await act(async () => {
      render(<QrReader onStart={spyStart} onResult={() => {}} onError={spyError} />);
    });

    expect(spyStart).not.toHaveBeenCalled();
    expect(spyError).toBeCalledWith(QR_READER_ERRORS[QrError.USER_DENY]);
  });

  test('should switch camera', async () => {
    const spyError = jest.fn();
    const spyStart = jest.fn();
    mockUserMedia();

    let rerender = (_: any) => {};
    await act(async () => {
      const callbacks = render(<QrReader onResult={() => {}} />);
      rerender = callbacks.rerender;
    });
    expect(spyError).not.toHaveBeenCalled();

    await act(async () => {
      rerender(<QrReader cameraId="camera_2" onStart={spyStart} onResult={() => {}} onError={spyError} />);
    });

    expect(spyStop).toHaveBeenCalled();
    expect(spyStart).toHaveBeenCalled();
    expect(spyError).not.toHaveBeenCalled();
  });

  test('should throw error on camera switch', async () => {
    const spyError = jest.fn();
    mockUserMedia();

    (BrowserQRCodeReader as unknown as jest.Mock).mockImplementation(() => ({
      decodeFromVideoDevice: jest.fn().mockResolvedValueOnce({ stop: spyStop }).mockRejectedValueOnce({}),
    }));

    let rerender = (_: any) => {};
    await act(async () => {
      const callbacks = render(<QrReader cameraId="camera_1" onResult={() => {}} onError={spyError} />);
      rerender = callbacks.rerender;
    });
    expect(spyError).not.toHaveBeenCalled();

    await act(async () => {
      rerender(<QrReader cameraId="camera_2" onResult={() => {}} onError={spyError} />);
    });

    expect(spyError).toBeCalledTimes(1);
    expect(spyError).toBeCalledWith(QR_READER_ERRORS[QrError.BAD_NEW_CAMERA]);
  });

  test('should call onCameraList with more than 1 camera', async () => {
    const spyCameraList = jest.fn();
    const list = [
      { deviceId: '1', label: 'Camera 1' },
      { deviceId: '2', label: 'Camera 2' },
    ];
    mockUserMedia();

    BrowserCodeReader.listVideoInputDevices = jest.fn().mockResolvedValue(list);

    await act(async () => {
      render(<QrReader onResult={() => {}} onCameraList={spyCameraList} />);
    });

    const result = list.map(({ deviceId, label }) => ({ id: deviceId, label }));
    expect(spyCameraList).toBeCalledWith(result);
  });

  test('should call onResult', async () => {
    const spyResult = jest.fn();
    mockUserMedia();

    BrowserCodeReader.listVideoInputDevices = jest.fn().mockResolvedValue([{ deviceId: '123', label: 'my_device' }]);
    (BrowserQRCodeReader as unknown as jest.Mock).mockImplementation(() => ({
      decodeFromVideoDevice: jest.fn().mockImplementation(() => {
        spyResult('test');

        return { stop: jest.fn() };
      }),
    }));

    await act(async () => {
      render(<QrReader onResult={spyResult} />);
    });

    expect(spyResult).toBeCalledTimes(1);
    expect(spyResult).toBeCalledWith('test');
  });
});
