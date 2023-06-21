import { BrowserCodeReader, BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import init, { Decoder, EncodingPacket } from 'raptorq';
import { useEffect, useRef } from 'react';
import { u8aToHex } from '@polkadot/util';

import cnTw from '@renderer/shared/utils/twMerge';
import { useI18n } from '@renderer/context/I18nContext';
import { ErrorFields, FRAME_KEY, SIGNED_TRANSACTION_BULK } from './common/constants';
import { QR_READER_ERRORS } from './common/errors';
import { DecodeCallback, ErrorObject, Progress, QrError, VideoInput } from './common/types';
import RaptorFrame from './RaptorFrame';
import { HexString } from '@renderer/domain/shared-kernel';
import { CRYPTO_SR25519 } from '../QrGenerator/common/constants';

const enum Status {
  'FIRST_FRAME',
  'NEXT_FRAME',
}

type Props = {
  size?: number;
  cameraId?: string;
  className?: string;
  bgVideo?: boolean;
  bgVideoClassName?: string;
  onStart?: () => void;
  onResult: (scanResult: HexString[]) => void;
  onError?: (error: ErrorObject) => void;
  onProgress?: (progress: Progress) => void;
  onCameraList?: (cameras: VideoInput[]) => void;
};

const QrMultiframeSignatureReader = ({
  size = 300,
  cameraId,
  className,
  bgVideo,
  bgVideoClassName,
  onCameraList,
  onResult,
  onProgress,
  onStart,
  onError,
}: Props) => {
  const { t } = useI18n();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream>();

  const scannerRef = useRef<BrowserQRCodeReader>();
  const controlsRef = useRef<IScannerControls>();

  const bgVideoRef = useRef<HTMLVideoElement>(null);
  const bgControlsRef = useRef<IScannerControls>();

  const videoStyle = { width: size + 'px', height: size + 'px' };

  const status = useRef<Status>(Status.FIRST_FRAME);
  const packets = useRef<Map<string, Uint8Array>>(new Map());
  const progress = useRef({ size: 0, total: 0, collected: new Set() });
  const isComplete = useRef(false);

  const isQrErrorObject = (error: unknown): boolean => {
    if (!error) return false;

    return typeof error === 'object' && ErrorFields.CODE in error && ErrorFields.MESSAGE in error;
  };

  const makeResultPayload = <T extends Uint8Array[]>(data?: T): HexString[] => {
    return (data || []).map((s) => u8aToHex(new Uint8Array([...CRYPTO_SR25519, ...s])));
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
    if (cameras.length > 0) {
      onCameraList?.(cameras);
    }

    return cameras.length;
  };

  const createFrame = (metadata?: Uint8Array[]): RaptorFrame => {
    if (!metadata) {
      throw QR_READER_ERRORS[QrError.FRAME_METADATA];
    }

    return new RaptorFrame(metadata[0]);
  };

  const handleFirstFrame = (
    raptorDecoder: Decoder,
    blockNumber: number,
    frameData: { size: number; total: number; payload: Uint8Array },
  ) => {
    // if it's the first frame from the multiframe QR
    const fountainResult = raptorDecoder.decode(frameData.payload);

    if (fountainResult) {
      // decode the 1st frame --> it's a single frame QR
      let result;
      try {
        result = SIGNED_TRANSACTION_BULK.decode(fountainResult);
      } catch (e) {
        console.error(e);
      }

      isComplete.current = true;
      onResult?.(makeResultPayload(result?.payload.map((item) => item.signature)));
    } else {
      // if there is more than 1 frame --> proceed scanning and keep the progress
      onProgress?.({ decoded: 1, total: frameData.total });
      status.current = Status.NEXT_FRAME;
      progress.current = {
        size: frameData.size,
        total: frameData.total,
        collected: new Set([blockNumber]),
      };
    }
  };

  const handleNextFrames = (raptorDecoder: Decoder, blockNumber: number, newSize: number) => {
    const { size, total, collected } = progress.current;

    // check if the user has started scanning another QR code
    if (size !== newSize) {
      throw QR_READER_ERRORS[QrError.NOT_SAME_QR];
    }

    if (collected.has(blockNumber)) return;

    collected.add(blockNumber);
    onProgress?.({ decoded: collected.size, total });

    let previousPacket;
    for (const [key, packet] of packets.current) {
      let fountainResult;

      if (previousPacket && previousPacket.length > packet.length) {
        //check if packet has correct size. If not remove it and wait when get it on next QR code rotation
        packets.current.delete(key);
        collected.delete(blockNumber);
        onProgress?.({ decoded: collected.size, total });
        break;
      }

      try {
        fountainResult = raptorDecoder.decode(packet);
      } catch (error) {
        packets.current.delete(key);
        collected.delete(blockNumber);
        onProgress?.({ decoded: collected.size, total });
        break;
      }

      if (!fountainResult) {
        previousPacket = packet;
        continue;
      }

      let result;
      try {
        result = SIGNED_TRANSACTION_BULK.decode(fountainResult);
      } catch (e) {
        console.error(e);
      }

      isComplete.current = true;

      onResult?.(makeResultPayload<Uint8Array[]>(result?.payload.map((item) => item.signature)));
      break;
    }
  };

  const startScanning = async (): Promise<void> => {
    if (!videoRef.current || !scannerRef.current) return;

    const decodeCallback: DecodeCallback = async (result): Promise<void> => {
      if (!result || isComplete.current) return;

      try {
        await init();

        const frame = createFrame(result.getResultMetadata().get(FRAME_KEY) as Uint8Array[]);

        const stringPayload = JSON.stringify(frame.data.payload);
        const isPacketExist = packets.current.get(stringPayload);
        if (isPacketExist) return;

        packets.current.set(stringPayload, frame.data.payload);
        const decodedPacket = EncodingPacket.deserialize(frame.data.payload);
        const raptorDecoder = Decoder.with_defaults(BigInt(frame.data.size), decodedPacket.data().length);
        const blockNumber = decodedPacket.encoding_symbol_id();

        if (status.current === Status.FIRST_FRAME) {
          handleFirstFrame(raptorDecoder, blockNumber, frame.data);
        } else if (status.current === Status.NEXT_FRAME) {
          handleNextFrames(raptorDecoder, blockNumber, frame.data.size);
        }
      } catch (error) {
        if (!isQrErrorObject(error)) {
          onError?.(QR_READER_ERRORS[QrError.DECODE_ERROR]);
        } else if ((error as ErrorObject).code === QrError.NOT_SAME_QR) {
          // Restart process for new QR
          packets.current = new Map();
          status.current = Status.FIRST_FRAME;
          progress.current = { size: 0, total: 0, collected: new Set() };
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

export default QrMultiframeSignatureReader;
