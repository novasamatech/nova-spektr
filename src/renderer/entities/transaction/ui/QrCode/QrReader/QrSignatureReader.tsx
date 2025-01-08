import { hexToU8a, u8aToHex } from '@polkadot/util';
import { BrowserCodeReader, BrowserQRCodeReader, type IScannerControls } from '@zxing/browser';
import init from 'raptorq/raptorq';
import { useEffect, useRef } from 'react';

import { type HexString } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { ErrorFields } from '../common/constants';
import { QR_READER_ERRORS } from '../common/errors';
import { type DecodeCallback, type ErrorObject, QrError, type VideoInput } from '../common/types';

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

export const QrSignatureReader = ({
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
    if (!error) {
      return false;
    }

    return typeof error === 'object' && ErrorFields.CODE in error && ErrorFields.MESSAGE in error;
  };

  const getVideoInputs = async (): Promise<number> => {
    const cameras: VideoInput[] = [];
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: true });

      const mediaDevices = await BrowserCodeReader.listVideoInputDevices();
      for (const { deviceId, label } of mediaDevices) {
        cameras.push({ id: deviceId, label });
      }
    } catch {
      throw QR_READER_ERRORS[QrError.USER_DENY];
    }

    if (cameras.length === 0) {
      throw QR_READER_ERRORS[QrError.NO_VIDEO_INPUT];
    }

    if (cameras.length > 0) {
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
    } catch {
      throw QR_READER_ERRORS[QrError.DECODE_ERROR];
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      for (const track of streamRef.current.getVideoTracks()) {
        track.stop();
      }
    }

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
      } catch {
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
        className={cnTw('absolute -scale-x-100 object-cover', className)}
        style={videoStyle}
      >
        {t('qrReader.videoError')}
      </video>
    );
  }

  return (
    <>
      <div className="relative h-[240px] w-[240px] overflow-hidden rounded-[22px]">
        <video
          muted
          autoPlay
          controls={false}
          ref={videoRef}
          data-testid="qr-reader"
          className={cnTw('absolute -scale-x-100 object-cover', className)}
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
        className={cnTw('absolute left-0 top-0 max-w-none -scale-x-100 object-cover blur-[14px]', bgVideoClassName)}
      />
      <div className="video-cover rounded-b-lg" />
    </>
  );
};
