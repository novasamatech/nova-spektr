import { hexToU8a, u8aToHex } from '@polkadot/util';
import { BrowserCodeReader, BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { useEffect, useRef } from 'react';
import init from 'raptorq';

import cnTw from '@renderer/shared/utils/twMerge';
import { useI18n } from '@renderer/context/I18nContext';
import { ErrorFields } from './common/constants';
import { QR_READER_ERRORS } from './common/errors';
import { DecodeCallback, ErrorObject, QrError, VideoInput } from './common/types';
import { HexString } from '@renderer/domain/shared-kernel';

type Props = {
  size?: number;
  cameraId?: string;
  className?: string;
  onStart?: () => void;
  bgVideo?: boolean;
  bgVideoClassName?: string;
  onResult: (scanResult: HexString) => void;
  onError?: (error: ErrorObject) => void;
  onCameraList?: (cameras: VideoInput[]) => void;
};

const QrSignatureReader = ({
  size = 300,
  cameraId,
  className,
  onCameraList,
  bgVideo = true,
  bgVideoClassName,
  onResult,
  onStart,
  onError,
}: Props) => {
  const { t } = useI18n();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream>();

  const scannerRef = useRef<BrowserQRCodeReader>();
  const controlsRef = useRef<IScannerControls>();
  const isComplete = useRef(false);

  const bgVideoRef = useRef<HTMLVideoElement>(null);
  const bgControlsRef = useRef<IScannerControls>();

  const videoStyle = { width: size + 'px', height: size + 'px' };

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
    // FIXME below:
    // if used cameras.length > 0 it triggers setting active camera in parent component
    // and that triggers useEffect(() => {...}, [cameraId]) which calls startScanning second time
    // and that leads to camera not being released after components close
    // need to check if scanning already started and passed cameraId same as cameraId used by current scanning process
    // so startScanning wouldn't be called second time
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
      if (bgVideoRef.current) {
        bgControlsRef.current = await scannerRef.current.decodeFromVideoDevice(
          cameraId,
          bgVideoRef.current,
          decodeCallback,
        );
      }
      onStart?.();
    } catch (error) {
      throw QR_READER_ERRORS[QrError.DECODE_ERROR];
    }
  };

  const stopScanning = () => {
    streamRef.current?.getVideoTracks().forEach((track) => track.stop());
    controlsRef.current?.stop();
    bgControlsRef.current?.stop();
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
        console.log('error_1');
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
        bgControlsRef.current?.stop();
        await startScanning();
      } catch (error) {
        onError?.(QR_READER_ERRORS[QrError.BAD_NEW_CAMERA]);
      }
    })();
  }, [cameraId]);

  if (!bgVideo) {
    return (
      <video
        muted
        autoPlay
        controls={false}
        ref={videoRef}
        data-testid="qr-reader"
        className={cnTw('object-cover  absolute -scale-x-100', className)}
        style={videoStyle}
      >
        {t('qrReader.videoError')}
      </video>
    );
  }

  return (
    <>
      <div className="relative w-[240px] h-[240px] rounded-[1.75rem] overflow-hidden">
        <video
          muted
          autoPlay
          controls={false}
          ref={videoRef}
          data-testid="qr-reader"
          className={cnTw('object-cover absolute -scale-x-100', className)}
        >
          {t('qrReader.videoError')}
        </video>
      </div>
      <video
        muted
        autoPlay
        controls={false}
        ref={bgVideoRef}
        data-testid="qr-reader"
        className={cnTw('absolute -scale-x-100 object-cover top-0 left-0 blur-[14px] max-w-none', bgVideoClassName)}
      />
      <div className="video-cover rounded-b-lg" />
    </>
  );
};

export default QrSignatureReader;
