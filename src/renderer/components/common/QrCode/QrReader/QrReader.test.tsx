import { render, screen } from '@testing-library/react';

import QrReader from './QrReader';

jest.mock('raptorq');

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('common/QrCode/QrReader', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render component', () => {
    render(<QrReader onStart={() => {}} onResult={() => {}} />);

    const video = screen.getByTestId('qr-reader');
    expect(video).toBeInTheDocument();
  });
});

// jest.mock('@renderer/context/I18nContext', () => ({
//   useI18n: jest.fn().mockReturnValue({
//     t: (key: string) => key,
//   }),
// }));
//
// describe.skip('common/QrCode/QrReader_OLD', () => {
//   const mockQrScanner = (override: any = {}) => {
//     (QrScanner as unknown as jest.Mock).mockReturnValue({
//       start: jest.fn().mockResolvedValue({}),
//       stop: jest.fn(),
//       destroy: jest.fn(),
//       ...override,
//     });
//   };
//
//   afterEach(() => {
//     jest.clearAllMocks();
//   });
//
//   test('should render component', () => {
//     render(<QrReader onResult={() => {}} />);
//
//     const root = screen.getByTestId('qr-reader');
//     expect(root).toBeInTheDocument();
//   });
//
//   test('should successfully start camera', async () => {
//     const spyError = jest.fn();
//     const spyStart = jest.fn().mockResolvedValue({});
//     mockQrScanner({ start: spyStart });
//
//     await act(async () => {
//       render(<QrReader onResult={() => {}} onError={spyError} />);
//     });
//
//     expect(spyStart).toBeCalledTimes(1);
//     expect(spyError).toBeCalledTimes(0);
//   });
//
//   test('should throw error on camera start', async () => {
//     const spyError = jest.fn();
//     const spyStart = jest.fn().mockRejectedValue({});
//     mockQrScanner({ start: spyStart });
//
//     await act(async () => {
//       render(<QrReader onResult={() => {}} onError={spyError} />);
//     });
//
//     expect(spyStart).toBeCalledTimes(1);
//     expect(spyError).toBeCalledWith(QR_READER_ERRORS[QrError.CANNOT_START]);
//   });
//
//   test('should not call onCameraList on a single camera', async () => {
//     const spyCameraList = jest.fn();
//     const list = [{ id: '1', label: 'Camera 1' }];
//
//     mockQrScanner();
//     QrScanner.listCameras = jest.fn().mockResolvedValue(list);
//
//     await act(async () => {
//       render(<QrReader onCameraList={spyCameraList} onResult={() => {}} />);
//     });
//
//     expect(spyCameraList).not.toBeCalledWith();
//   });
//
//   test('should call onCameraList with more than 1 camera', async () => {
//     const spyCameraList = jest.fn();
//     const list = [
//       { id: '1', label: 'Camera 1' },
//       { id: '2', label: 'Camera 2' },
//     ];
//
//     mockQrScanner();
//     QrScanner.listCameras = jest.fn().mockResolvedValue(list);
//
//     await act(async () => {
//       render(<QrReader onCameraList={spyCameraList} onResult={() => {}} />);
//     });
//
//     expect(spyCameraList).toBeCalledWith(list);
//   });
//
//   test('should switch camera', async () => {
//     const spyError = jest.fn();
//     const spySetCamera = jest.fn();
//     mockQrScanner({ setCamera: spySetCamera });
//
//     let rerender = (_: any) => {};
//     await act(async () => {
//       const callbacks = render(<QrReader cameraId="camera_1" onResult={() => {}} onError={spyError} />);
//       rerender = callbacks.rerender;
//     });
//     expect(spyError).not.toBeCalled();
//     expect(spySetCamera).not.toBeCalled();
//
//     await act(async () => {
//       rerender(<QrReader cameraId="camera_2" onResult={() => {}} onError={spyError} />);
//     });
//
//     expect(spyError).not.toBeCalled();
//     expect(spySetCamera).toBeCalledWith('camera_2');
//   });
//
//   test('should throw error on camera switch', async () => {
//     const spyError = jest.fn();
//     mockQrScanner({
//       setCamera: jest.fn().mockRejectedValue({}),
//     });
//
//     let rerender = (_: any) => {};
//     await act(async () => {
//       const callbacks = render(<QrReader cameraId="camera_1" onResult={() => {}} onError={spyError} />);
//       rerender = callbacks.rerender;
//     });
//     expect(spyError).not.toBeCalled();
//
//     await act(async () => {
//       rerender(<QrReader cameraId="camera_2" onResult={() => {}} onError={spyError} />);
//     });
//
//     expect(spyError).toBeCalledTimes(1);
//     expect(spyError).toBeCalledWith(QR_READER_ERRORS[QrError.BAD_NEW_CAMERA]);
//   });
//
//   test('should call onResult', async () => {
//     const spyResult = jest.fn();
//     const result = 'scan_result';
//     let resultCallback = (_: any) => {};
//
//     (QrScanner as unknown as jest.Mock).mockImplementation((_, callback) => {
//       resultCallback = callback;
//
//       return {
//         start: jest.fn().mockResolvedValue({}),
//         stop: jest.fn(),
//         destroy: jest.fn(),
//       };
//     });
//
//     await act(async () => {
//       render(<QrReader onResult={spyResult} />);
//     });
//
//     act(() => resultCallback({ data: result }));
//
//     expect(spyResult).toBeCalledTimes(1);
//     expect(spyResult).toBeCalledWith(result);
//   });
//
//   test('should display check mark on success', async () => {
//     let resultCallback = (_: any) => {};
//
//     (QrScanner as unknown as jest.Mock).mockImplementation((_, callback) => {
//       resultCallback = callback;
//
//       return {
//         start: jest.fn().mockResolvedValue({}),
//         stop: jest.fn(),
//         destroy: jest.fn(),
//       };
//     });
//
//     await act(async () => {
//       render(<QrReader onResult={() => {}} />);
//     });
//
//     const checkmarkBefore = screen.queryByTestId('checkmarkCutout-svg');
//     expect(checkmarkBefore).not.toBeInTheDocument();
//     act(() => resultCallback({ data: 'result' }));
//
//     const checkmarkAfter = screen.getByTestId('checkmarkCutout-svg');
//     expect(checkmarkAfter).toBeInTheDocument();
//   });
//
//   test('should clean on unmount', async () => {
//     const spyStop = jest.fn();
//     const spyDestroy = jest.fn();
//
//     mockQrScanner({
//       stop: spyStop,
//       destroy: spyDestroy,
//     });
//
//     let unmount = () => {};
//     await act(async () => {
//       const callbacks = render(<QrReader onResult={() => {}} />);
//       unmount = callbacks.unmount;
//     });
//
//     unmount();
//
//     expect(spyStop).toBeCalledTimes(1);
//     expect(spyDestroy).toBeCalledTimes(1);
//   });
// });
