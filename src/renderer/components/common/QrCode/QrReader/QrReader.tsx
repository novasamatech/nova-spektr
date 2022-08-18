// eslint-disable-next-line import/default
import QrScanner from 'qr-scanner';
import cn from 'classnames';
import { useEffect, useRef, useState } from 'react';
import isUndefined from 'lodash/isUndefined';

import { Icon } from '@renderer/components/ui';
import { QR_READER_ERRORS } from './common/errors';
import { ErrorObject, Errors } from './common/types';

type Props = {
  size?: number;
  cameraId?: string;
  onCameraList?: (cameras: QrScanner.Camera[]) => void;
  onResult: (data: string) => void;
  onError?: (error: ErrorObject) => void;
};

const QrReader = ({ size = 300, cameraId, onCameraList, onResult, onError }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScanner = useRef<QrScanner>();

  const [isScanComplete, setIsScanComplete] = useState(false);

  const getVideoInputs = async (): Promise<number | undefined> => {
    if (!onCameraList) return;

    let cameras = [];
    try {
      cameras = await QrScanner.listCameras(true);
    } catch (error) {
      throw QR_READER_ERRORS[Errors.UNABLE_TO_GET_MEDIA];
    }

    if (cameras.length === 0) {
      throw QR_READER_ERRORS[Errors.NO_VIDEO_INPUT];
    } else {
      onCameraList(cameras);

      return cameras.length;
    }
  };

  const startCamera = async () => {
    if (!videoRef.current) return;

    const scanner = new QrScanner(
      videoRef.current,
      ({ data }) => {
        setIsScanComplete(true);
        scanner.stop();
        scanner.destroy();
        onResult(data);
      },
      { maxScansPerSecond: 10, preferredCamera: cameraId },
    );

    try {
      await scanner.start();
      qrScanner.current = scanner;
    } catch (error) {
      scanner.stop();
      scanner.destroy();
      throw QR_READER_ERRORS[Errors.CANNOT_START];
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const camerasAmount = await getVideoInputs();
        if (!isUndefined(camerasAmount) && camerasAmount > 1) return;

        await startCamera();
      } catch (error) {
        onError?.(error as ErrorObject);
      }
    })();

    return () => {
      qrScanner.current?.stop();
      qrScanner.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (!cameraId) return;

    if (qrScanner.current) {
      const setNewCamera = async () => {
        try {
          await qrScanner.current?.setCamera(cameraId);
        } catch (error) {
          onError?.(QR_READER_ERRORS[Errors.BAD_NEW_CAMERA]);
        }
      };

      setNewCamera();
    } else {
      startCamera();
    }
  }, [cameraId]);

  return (
    <div className="flex flex-col" data-testid="qr-reader">
      <div className="relative rounded-3xl after:absolute after:inset-0 after:rounded-3xl after:border-4 after:border-shade-70/20">
        <video
          muted
          autoPlay
          controls={false}
          ref={videoRef}
          className="rounded-3xl bg-shade-60 object-cover -scale-x-100"
          style={{ width: size + 'px', height: size + 'px' }}
        >
          Your browser doesn't support video
        </video>
        {isScanComplete && <div className="absolute inset-0 backdrop-blur-sm rounded-3xl" />}
        <Icon
          as="svg"
          name="qrFrame"
          className={cn(
            'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
            isScanComplete ? 'text-success' : 'text-white',
          )}
          size={size * 0.8}
        />
        {isScanComplete && (
          <Icon
            as="svg"
            name="checkmarkCutout"
            className={cn(
              'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white',
              isScanComplete ? 'text-success' : 'text-white',
            )}
            size={size * 0.25}
          />
        )}
      </div>
    </div>
  );
};

export default QrReader;
