import { hexToU8a, u8aToHex } from '@polkadot/util';
import { BrowserCodeReader, BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { useEffect, useRef } from 'react';
import init from 'raptorq';

import cnTw from '@renderer/shared/utils/twMerge';
import { useI18n } from '@renderer/context/I18nContext';
import { ErrorFields } from './common/constants';
import { QR_READER_ERRORS } from './common/errors';
import { DecodeCallback, ErrorObject, QrError, VideoInput } from './common/types';

type Props = {
  size?: number | [number, number];
  cameraId?: string;
  className?: string;
  onStart?: () => void;
  onResult: (scanResult: string) => void;
  onError?: (error: ErrorObject) => void;
  onCameraList?: (cameras: VideoInput[]) => void;
};

const QrSignatureReader = ({ size = 300, cameraId, className, onCameraList, onResult, onStart, onError }: Props) => {
  const { t } = useI18n();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream>();

  const scannerRef = useRef<BrowserQRCodeReader>();
  const controlsRef = useRef<IScannerControls>();
  const isComplete = useRef(false);

  const videoStyle =
    typeof size === 'number'
      ? { width: size + 'px', height: size + 'px' }
      : { width: size[0] + 'px', height: size[1] + 'px' };

  const isQrErrorObject = (error: unknown): boolean => {
    if (!error) return false;

    return typeof error === 'object' && ErrorFields.CODE in error && ErrorFields.MESSAGE in error;
  };

  const getVideoInputs = async (): Promise<number> => {
    const cameras: VideoInput[] = [];
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: true });

      const mediaDevices = await BrowserCodeReader.listVideoInputDevices();
      mediaDevices.forEach(({ deviceId, label }) => cameras.push({ id: deviceId, label }));
    } catch (error) {
      throw QR_READER_ERRORS[QrError.USER_DENY];
    }

    if (cameras.length === 0) {
      throw QR_READER_ERRORS[QrError.NO_VIDEO_INPUT];
    }
    if (cameras.length > 1) {
      onCameraList?.(cameras);
    }

    return cameras.length;
  };

  const startScanning = async (): Promise<void> => {
    if (!videoRef.current || !scannerRef.current) return;

    const decodeCallback: DecodeCallback = async (result): Promise<void> => {
      if (!result || isComplete.current) return;

      try {
        await init();

        const qr = result.getText();

        const signature = u8aToHex(hexToU8a(qr));
        isComplete.current = true;
        onResult?.(signature);
      } catch (error) {
        if (!isQrErrorObject(error)) {
          onError?.(QR_READER_ERRORS[QrError.DECODE_ERROR]);
        } else {
          onError?.(error as ErrorObject);
        }
      }
    };

    try {
      controlsRef.current = await scannerRef.current.decodeFromVideoDevice(cameraId, videoRef.current, decodeCallback);
      onStart?.();
    } catch (error) {
      throw QR_READER_ERRORS[QrError.DECODE_ERROR];
    }
  };

  const stopScanning = () => {
    streamRef.current?.getVideoTracks().forEach((track) => track.stop());
    controlsRef.current?.stop();
  };

  useEffect(() => {
    (async () => {
      try {
        const camerasAmount = await getVideoInputs();
        scannerRef.current = new BrowserQRCodeReader(undefined, {
          delayBetweenScanAttempts: 50,
          delayBetweenScanSuccess: 50,
        });

        if (!camerasAmount || camerasAmount === 1) {
          await startScanning();
        }
      } catch (error) {
        onError?.(error as ErrorObject);
      }
    })();

    return () => {
      stopScanning();
    };
  }, []);

  useEffect(() => {
    if (!cameraId) return;

    (async () => {
      try {
        controlsRef.current?.stop();
        await startScanning();
      } catch (error) {
        onError?.(QR_READER_ERRORS[QrError.BAD_NEW_CAMERA]);
      }
    })();
  }, [cameraId]);

  return (
    <video
      muted
      autoPlay
      controls={false}
      ref={videoRef}
      data-testid="qr-reader"
      className={cnTw('object-cover -scale-x-100', className)}
      style={videoStyle}
    >
      {t('qrReader.videoError')}
    </video>
  );
};

export default QrSignatureReader;
