import { decodeAddress } from '@polkadot/util-crypto';
import { type Result } from '@zxing/library';
import init, { Decoder, EncodingPacket } from 'raptorq/raptorq';
import { useRef } from 'react';

import { CryptoTypeString } from '@/shared/core';
import { validateSignerFormat } from '@/shared/lib/utils';
import { QR_READER_ERRORS, QrReader, type QrReaderCamera, QrReaderErrorCode } from '@/shared/ui-kit';
import {
  DYNAMIC_DERIVATIONS_ADDRESS_RESPONSE,
  EXPORT_ADDRESS,
  ErrorFields,
  FRAME_KEY,
  type VaultFeature,
} from '../common/constants';
import { QR_READER_DECODE_ERRORS } from '../common/errors';
import { type DdSeedInfo, DecodeQrError, type ErrorObject, type Progress, type SeedInfo } from '../common/types';

import { RaptorFrame } from './RaptorFrame';

const CryptoTypes: Record<string, Exclude<CryptoTypeString, CryptoTypeString.ETHEREUM>> = {
  substrate: CryptoTypeString.SR25519,
  ethereum: CryptoTypeString.ECDSA,
};

const createFrame = (metadata?: Uint8Array[]): RaptorFrame => {
  if (!metadata) {
    throw QR_READER_DECODE_ERRORS[DecodeQrError.FRAME_METADATA];
  }

  return new RaptorFrame(metadata[0]);
};

const enum Status {
  'FIRST_FRAME',
  'NEXT_FRAME',
}

type WithFeatures = { features: VaultFeature[] };
type ScanResult = string | SeedInfo[] | ({ addr: SeedInfo } & WithFeatures) | { addr: DdSeedInfo };

type Props = {
  size?: number | [number, number];
  cameraId: string | null;
  isDynamicDerivations?: boolean;
  onError?(error: ErrorObject): void;
  onProgress?(progress: Progress): void;
  onCameraList(cameras: QrReaderCamera[]): void;
  onResult(scanResult: (SeedInfo | DdSeedInfo)[]): void;
};

export const VaultQrReader = ({
  size = 300,
  cameraId,
  isDynamicDerivations,
  onCameraList,
  onResult,
  onProgress,
  onError,
}: Props) => {
  const status = useRef<Status>(Status.FIRST_FRAME);
  const packets = useRef<Map<string, Uint8Array>>(new Map());
  const progress = useRef({ size: 0, total: 0, collected: new Set() });
  const isComplete = useRef(false);

  const isQrErrorObject = (error: unknown): boolean => {
    if (!error) return false;

    return typeof error === 'object' && ErrorFields.CODE in error && ErrorFields.MESSAGE in error;
  };

  const makeResultPayload = (data: ScanResult): (SeedInfo | DdSeedInfo)[] => {
    if (Array.isArray(data)) return data;

    if (typeof data === 'string') {
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
    }

    return 'features' in data ? [{ ...data.addr, features: data.features }] : [data.addr];
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
      throw QR_READER_DECODE_ERRORS[DecodeQrError.NOT_SAME_QR];
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

  const decodeFrame = async (result: Result): Promise<void> => {
    if (isComplete.current) return;

    try {
      await init();

      const isSimpleQr = handleSimpleQr(result.getText());
      if (isSimpleQr) return;

      const resultMetadata = result.getResultMetadata().get(FRAME_KEY) as Uint8Array[];
      if (!resultMetadata || resultMetadata.length === 0) {
        // If no metadata, it's not a multiframe QR, skip processing
        return;
      }

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
        onError?.(QR_READER_ERRORS[QrReaderErrorCode.DECODE_ERROR]);
      } else if ((error as ErrorObject).code === DecodeQrError.NOT_SAME_QR) {
        // Restart process for new QR
        packets.current = new Map();
        status.current = Status.FIRST_FRAME;
        progress.current = { size: 0, total: 0, collected: new Set() };
      } else {
        onError?.(error as ErrorObject);
      }
    }
  };
  return (
    <QrReader size={size} cameraId={cameraId} onCameraList={onCameraList} onResult={decodeFrame} onError={onError} />
  );
};
