import { decodeAddress } from '@polkadot/util-crypto';
import { BrowserCodeReader, BrowserQRCodeReader, type IScannerControls } from '@zxing/browser';
import init, { Decoder, EncodingPacket } from 'raptorq/raptorq';
import { useEffect, useRef } from 'react';

import { CryptoTypeString } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, validateSignerFormat } from '@/shared/lib/utils';
import {
  DYNAMIC_DERIVATIONS_ADDRESS_RESPONSE,
  EXPORT_ADDRESS,
  ErrorFields,
  FRAME_KEY,
  type VaultFeature,
} from '../common/constants';
import { QR_READER_ERRORS } from '../common/errors';
import {
  type DdSeedInfo,
  type DecodeCallback,
  type ErrorObject,
  type Progress,
  QrError,
  type SeedInfo,
  type VideoInput,
} from '../common/types';

import RaptorFrame from './RaptorFrame';

const enum Status {
  'FIRST_FRAME',
  'NEXT_FRAME',
}

type WithFeatures = { features: VaultFeature[] };
type ScanResult = string | SeedInfo[] | ({ addr: SeedInfo } & WithFeatures) | { addr: DdSeedInfo };

type Props = {
  size?: number | [number, number];
  cameraId?: string;
  className?: string;
  bgVideo?: boolean;
  bgVideoClassName?: string;
  wrapperClassName?: string;
  isDynamicDerivations?: boolean;
  onStart?: () => void;
  onResult: (scanResult: (SeedInfo | DdSeedInfo)[]) => void;
  onError?: (error: ErrorObject) => void;
  onProgress?: (progress: Progress) => void;
  onCameraList?: (cameras: VideoInput[]) => void;
};

export const QrReader = ({
  size = 300,
  cameraId,
  className,
  isDynamicDerivations,
  bgVideo,
  bgVideoClassName,
  wrapperClassName,
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

  const status = useRef<Status>(Status.FIRST_FRAME);
  const packets = useRef<Map<string, Uint8Array>>(new Map());
  const progress = useRef({ size: 0, total: 0, collected: new Set() });
  const isComplete = useRef(false);
  const sizeStyle = Array.isArray(size) ? { width: size[0], height: size[1] } : { width: size, height: size };

  const isQrErrorObject = (error: unknown): boolean => {
    if (!error) {
      return false;
    }

    return typeof error === 'object' && ErrorFields.CODE in error && ErrorFields.MESSAGE in error;
  };

  const CryptoTypes: Record<string, Exclude<CryptoTypeString, CryptoTypeString.ETHEREUM>> = {
    substrate: CryptoTypeString.SR25519,
    ethereum: CryptoTypeString.ECDSA,
  };

  const makeResultPayload = <T extends ScanResult>(data: T): (SeedInfo | DdSeedInfo)[] => {
    if (Array.isArray(data)) {
      return data;
    }

    if (typeof data !== 'string') {
      const payload = { ...data.addr };
      if ('features' in (data as WithFeatures)) {
        (payload as SeedInfo).features = (data as WithFeatures).features;
      }

      return [payload];
    }

    const [cryptoType, address] = data.split(':');

    return [
      {
        name: '',
        derivedKeys: [],
        multiSigner: {
          MultiSigner: CryptoTypes[cryptoType],
          public: decodeAddress(address),
        },
      },
    ];
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
    if (cameras.length > 1) {
      onCameraList?.(cameras);
    }

    return cameras.length;
  };

  const handleSimpleQr = (signerAddress: string): boolean => {
    if (!validateSignerFormat(signerAddress)) {
      return false;
    }

    isComplete.current = true;
    onProgress?.({ decoded: 1, total: 1 });
    onResult?.(makeResultPayload(signerAddress));

    return true;
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
      let result: ScanResult;
      if (isDynamicDerivations) {
        result = DYNAMIC_DERIVATIONS_ADDRESS_RESPONSE.decode(fountainResult.slice(3));
      } else {
        result = EXPORT_ADDRESS.decode(fountainResult.slice(3)).payload;
      }
      isComplete.current = true;

      onResult?.(makeResultPayload(result));
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
      } catch {
        packets.current.delete(key);
        collected.delete(blockNumber);
        onProgress?.({ decoded: collected.size, total });
        break;
      }

      if (!fountainResult) {
        previousPacket = packet;
        continue;
      }

      let result: ScanResult;
      if (isDynamicDerivations) {
        result = DYNAMIC_DERIVATIONS_ADDRESS_RESPONSE.decode(fountainResult.slice(3));
      } else {
        result = EXPORT_ADDRESS.decode(fountainResult.slice(3)).payload;
      }

      onResult?.(makeResultPayload(result));
      isComplete.current = true;
      break;
    }
  };

  const startScanning = async (): Promise<void> => {
    if (!videoRef.current || !scannerRef.current) return;

    const decodeCallback: DecodeCallback = async (result): Promise<void> => {
      if (!result || isComplete.current) return;

      try {
        await init();

        const isSimpleQr = handleSimpleQr(result.getText());
        if (isSimpleQr) return;

        const resultMetadata = result.getResultMetadata().get(FRAME_KEY) as Uint8Array[];
        if (resultMetadata.length > 1) return;

        const frame = createFrame(resultMetadata);

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
        {...sizeStyle}
      >
        {t('qrReader.videoError')}
      </video>
    );
  }

  return (
    <>
      <div
        className={cnTw(
          'absolute inset-0 z-10 flex h-full w-full items-center justify-center overflow-hidden rounded-[1.75rem]',
          wrapperClassName,
        )}
      >
        <div className="h-[240px] w-[240px] overflow-hidden rounded-[20px]">
          <video
            muted
            autoPlay
            controls={false}
            ref={videoRef}
            data-testid="qr-reader"
            style={sizeStyle}
            className={cnTw('-scale-x-100 object-cover object-center', className)}
          >
            {t('qrReader.videoError')}
          </video>
        </div>
      </div>
      <video
        muted
        autoPlay
        controls={false}
        ref={bgVideoRef}
        data-testid="qr-reader"
        style={sizeStyle}
        className={cnTw(
          'h-full w-full max-w-none scale-100 -scale-x-100 object-cover object-center blur-[14px]',
          bgVideoClassName,
        )}
      />
      <div className="video-cover" />
    </>
  );
};
