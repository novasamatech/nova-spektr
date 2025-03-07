import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser';
import { type Result } from '@zxing/library';
import { memo, useEffect, useMemo, useRef, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';

import { QR_READER_ERRORS } from './errors';
import { getMediaStream, getVideoDevices, requestAccess, stopMediaStream } from './helpers';
import { type QrReaderCamera, type QrReaderError, QrReaderErrorCode } from './types';

const FRAME_SIZE = 240;

export type QrScanResult = {
  text: string;
  metadata: Uint8Array;
};

type Props = {
  size?: number | [number, number];
  cameraId: string | null;
  onResult(result: Result): unknown;
  onError?(error: QrReaderError): unknown;
  onCameraList(cameras: QrReaderCamera[]): unknown;
};

export const QrReader = memo(({ size = 300, cameraId, onCameraList, onResult, onError }: Props) => {
  const { t } = useI18n();

  const streamRef = useRef<MediaStream>();
  const scaner = useMemo(() => {
    return new BrowserQRCodeReader(undefined, {
      delayBetweenScanAttempts: 50,
      delayBetweenScanSuccess: 50,
    });
  }, []);

  const controlsRef = useRef<IScannerControls>();

  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [bgVideo, setBgVideo] = useState<HTMLVideoElement | null>(null);
  const [active, setActive] = useState<boolean | null>(null);
  const activeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const highlightBorder = () => {
    setActive(true);
    if (activeTimeoutRef.current) {
      clearTimeout(activeTimeoutRef.current);
    }
    activeTimeoutRef.current = setTimeout(() => {
      setActive(false);
    }, 500);
  };

  const startScanning = async (video: HTMLVideoElement, cameraId: string): Promise<void> => {
    try {
      controlsRef.current = await scaner.decodeFromVideoDevice(cameraId, video, result => {
        if (result) {
          onResult?.(result);
          highlightBorder();
        }
      });
    } catch {
      throw QR_READER_ERRORS[QrReaderErrorCode.DECODE_ERROR];
    }
  };

  useEffect(() => {
    const mounted = true;
    const request = requestAccess();
    request
      .then(() => getVideoDevices())
      .then(cameras => {
        if (mounted) {
          onCameraList?.(cameras);
        }
      })
      .catch(onError);

    return () => {
      request.then(stopMediaStream);
    };
  }, []);

  useEffect(() => {
    if (!cameraId || !bgVideo || !video) return;

    let mounted = true;
    const mediaStreamPromise = getMediaStream(cameraId);

    mediaStreamPromise
      .then(stream => {
        if (!mounted) return;
        streamRef.current = stream;
        video.srcObject = stream;
        bgVideo.srcObject = stream;

        return startScanning(video, cameraId);
      })
      .catch(onError);

    return () => {
      mounted = false;
      controlsRef.current?.stop();
      mediaStreamPromise.then(stopMediaStream);
    };
  }, [cameraId, bgVideo, video]);

  const bgSizeX = Math.max(FRAME_SIZE, Array.isArray(size) ? size[0] : size);
  const bgSizeY = Math.max(FRAME_SIZE, Array.isArray(size) ? size[1] : size);
  const sizeStyle = { width: bgSizeX, height: bgSizeY };
  const topOffset = (bgSizeY - FRAME_SIZE) / 2;

  return (
    <div className="relative" style={sizeStyle}>
      <div className="absolute inset-0 z-10 flex h-full w-full items-center justify-center overflow-hidden rounded-[1.75rem]">
        <div className="relative overflow-hidden rounded-[20px]" style={{ width: FRAME_SIZE, height: FRAME_SIZE }}>
          <video
            muted
            autoPlay
            controls={false}
            ref={setVideo}
            data-testid="qr-reader"
            style={{ ...sizeStyle, top: -topOffset }}
            className="relative scale-100 -scale-x-100 bg-black object-cover object-center"
          >
            {t('qrReader.videoError')}
          </video>
          <Icon
            name="qrFrame"
            size={FRAME_SIZE}
            className={cnTw(
              'absolute inset-0 text-white transition-all duration-500',
              active ? 'opacity-50' : 'opacity-100',
            )}
          />
        </div>
      </div>
      <video
        muted
        autoPlay
        controls={false}
        ref={setBgVideo}
        data-testid="qr-reader-background"
        className="h-full w-full max-w-none -scale-x-100 bg-black object-cover object-center blur-[14px]"
      />
      <div className="video-cover" />
    </div>
  );
});
