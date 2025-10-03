import { decodeAddress } from '@polkadot/util-crypto';
import { type Result } from '@zxing/library';
import init, { Decoder, EncodingPacket } from 'raptorq/raptorq';
import { useRef, useState } from 'react';

import { CryptoTypeString } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, getPlatformType, validateSignerFormat } from '@/shared/lib/utils';
import { Button, CaptionText, FootnoteText, Icon, Loader, SmallTitleText } from '@/shared/ui';
import { QrReader, type QrReaderCamera, QrReaderErrorCode, Select } from '@/shared/ui-kit';
import {
  DYNAMIC_DERIVATIONS_ADDRESS_RESPONSE,
  EXPORT_ADDRESS,
  ErrorFields,
  FRAME_KEY,
  type VaultFeature,
} from '../common/constants';
import { QR_READER_DECODE_ERRORS } from '../common/errors';
import { type DdSeedInfo, DecodeQrError, type ErrorObject, type SeedInfo } from '../common/types';

import { RaptorFrame } from './RaptorFrame';

const enum CameraState {
  ACTIVE,
  LOADING,
  INVALID_ERROR,
  MULTISHARD_ERROR,
  DECODE_ERROR,
  DENY_ERROR,
  NO_VIDEO_INPUT,
  NOT_SAME_QR_ERROR,
}

const CryptoTypes: Record<string, Exclude<CryptoTypeString, CryptoTypeString.ETHEREUM>> = {
  substrate: CryptoTypeString.SR25519,
  ethereum: CryptoTypeString.ECDSA,
};

const createFrame = (metadata?: Uint8Array[]): RaptorFrame => {
  if (!metadata) {
    throw QR_READER_DECODE_ERRORS[DecodeQrError.INVALID];
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
  isDynamicDerivations?: boolean;
  onResult(scanResult: (SeedInfo | DdSeedInfo)[]): void;
  onBack(): void;
};

export const VaultQrReader = ({ size = 300, isDynamicDerivations, onResult, onBack }: Props) => {
  const [cameraState, setCameraState] = useState<CameraState>(CameraState.LOADING);
  const [activeCamera, setActiveCamera] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<Record<'title' | 'value', string>[]>([]);
  const [{ decodedFrames, totalFrames }, setProgress] = useState({ decodedFrames: 0, totalFrames: 0 });

  const { t } = useI18n();

  const status = useRef<Status>(Status.FIRST_FRAME);
  const packets = useRef<Map<string, Uint8Array>>(new Map());
  const progress = useRef({ size: 0, total: 0, collected: new Set() });
  const isComplete = useRef(false);

  const isCameraPending = CameraState.LOADING === cameraState;

  const isCameraError = [CameraState.DENY_ERROR, CameraState.NO_VIDEO_INPUT].includes(cameraState);

  const isQrError = [
    CameraState.DECODE_ERROR,
    CameraState.NOT_SAME_QR_ERROR,
    CameraState.MULTISHARD_ERROR,
    CameraState.INVALID_ERROR,
  ].includes(cameraState);

  let errorLabel;
  let errorDescription;

  switch (cameraState) {
    case CameraState.INVALID_ERROR:
      errorLabel = t('onboarding.paritySigner.invalidQrLabel');
      errorDescription = t('onboarding.paritySigner.invalidQrDescription');
      break;
    case CameraState.MULTISHARD_ERROR:
      errorLabel = t('onboarding.paritySigner.multishardQRCodeLabel');
      errorDescription = t('onboarding.paritySigner.multishardQRCodeDescription');
      break;
    case CameraState.DECODE_ERROR:
      errorLabel = t('onboarding.paritySigner.decodeErrorLabel');
      errorDescription = t('onboarding.paritySigner.decodeErrorDescription');
      break;
    case CameraState.DENY_ERROR:
      errorLabel = t('onboarding.paritySigner.cameraAccessDeniedLabel');
      errorDescription = t('onboarding.paritySigner.cameraAccessDeniedDescription');
      break;
    case CameraState.NO_VIDEO_INPUT:
      errorLabel = t('onboarding.paritySigner.noVideoInputLabel');
      errorDescription = t('onboarding.paritySigner.noVideoInputDescription');
      break;
    case CameraState.NOT_SAME_QR_ERROR:
      errorLabel = t('onboarding.paritySigner.notSameQrErrorLabel');
      errorDescription = t('onboarding.paritySigner.notSameQrErrorDescription');
      break;
  }

  const isQrErrorObject = (error: unknown): boolean => {
    if (!error) return false;

    return typeof error === 'object' && ErrorFields.CODE in error && ErrorFields.MESSAGE in error;
  };

  const resetCamera = () => {
    setActiveCamera(null);
    setProgress({ decodedFrames: 0, totalFrames: 0 });
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
    setProgress({ decodedFrames: 1, totalFrames: 1 });
    onScanResult(makeResultPayload(signerAddress));

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

      onScanResult(makeResultPayload(result));
    } else {
      // if there is more than 1 frame --> proceed scanning and keep the progress
      setProgress({ decodedFrames: 1, totalFrames: frameData.total });
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
    setProgress({ decodedFrames: collected.size, totalFrames: total });

    let previousPacket;
    for (const [key, packet] of packets.current) {
      let fountainResult;

      if (previousPacket && previousPacket.length > packet.length) {
        //check if packet has correct size. If not remove it and wait when get it on next QR code rotation
        packets.current.delete(key);
        collected.delete(blockNumber);
        setProgress({ decodedFrames: collected.size, totalFrames: total });
        break;
      }

      try {
        fountainResult = raptorDecoder.decode(packet);
      } catch {
        packets.current.delete(key);
        collected.delete(blockNumber);
        setProgress({ decodedFrames: collected.size, totalFrames: total });
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

      onScanResult(makeResultPayload(result));
      isComplete.current = true;
      break;
    }
  };

  const onScanResult = (scanResult: (SeedInfo | DdSeedInfo)[]) => {
    if (!isDynamicDerivations && scanResult.length > 1) {
      setCameraState(CameraState.MULTISHARD_ERROR);
      resetCamera();
      return;
    }

    try {
      onResult(scanResult);
    } catch {
      setCameraState(CameraState.INVALID_ERROR);
      resetCamera();
    }
  };

  const decodeFrame = async (result: Result): Promise<void> => {
    if (isComplete.current) return;

    try {
      await init();

      const isSimpleQr = handleSimpleQr(result.getText());
      if (isSimpleQr) return;

      const resultMetadata = result.getResultMetadata().get(FRAME_KEY) as Uint8Array[];
      if (!resultMetadata?.length) {
        // If no metadata, it's not a multiframe QR - this is an invalid QR for Polkadot Vault
        onError?.(QR_READER_DECODE_ERRORS[DecodeQrError.INVALID]);
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
        onError?.(QR_READER_DECODE_ERRORS[DecodeQrError.INVALID]);
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

  const handleCameraList = (cameras: QrReaderCamera[]) => {
    setCameraState(CameraState.ACTIVE);
    const formattedCameras = cameras.map((camera) => ({
      title: camera.label,
      value: camera.deviceId,
    }));

    setAvailableCameras(formattedCameras);

    const defaultCamera = formattedCameras.at(0);
    if (defaultCamera) {
      setActiveCamera(defaultCamera.value);
    }
  };

  const onRetryCamera = () => {
    if (isCameraError) {
      setCameraState(CameraState.LOADING);
      setActiveCamera(null);
    } else {
      setCameraState(CameraState.ACTIVE);
    }
    status.current = Status.FIRST_FRAME;
    packets.current = new Map();
    progress.current = { size: 0, total: 0, collected: new Set() };
    isComplete.current = false;
  };

  const onError = (error: ErrorObject) => {
    switch (error.code) {
      case QrReaderErrorCode.USER_DENY:
        setCameraState(CameraState.DENY_ERROR);
        break;
      case QrReaderErrorCode.DECODE_ERROR:
        setCameraState(CameraState.DECODE_ERROR);
        break;
      case QrReaderErrorCode.NO_VIDEO_INPUT:
        setCameraState(CameraState.NO_VIDEO_INPUT);
        break;
      case DecodeQrError.NOT_SAME_QR:
        setCameraState(CameraState.NOT_SAME_QR_ERROR);
        break;
      default:
        setCameraState(CameraState.INVALID_ERROR);
        break;
    }
  };

  const sizeStyle = Array.isArray(size) ? { width: size[0], height: size[1] } : { width: size, height: size };

  return (
    <div className="flex w-full min-w-80 flex-col justify-between gap-4 px-5 pt-3">
      <SmallTitleText>{t('onboarding.vault.scanTitle')}</SmallTitleText>

      {isCameraPending && (
        <div className="flex h-[288px] w-full flex-col items-center">
          <div className="relative flex h-full w-full items-center justify-center">
            <p className="absolute flex items-center gap-x-2.5 pb-3.5 font-semibold text-shade-40">
              <Loader color="primary" />
              {t('onboarding.paritySigner.startCameraLabel')}
            </p>
            <Icon className="absolute text-shade-12" name="qrFrame" size={240} />
          </div>
        </div>
      )}

      {isCameraError ? (
        <div className="m-auto flex h-full max-h-[240px] w-full max-w-[240px] flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-filter-border p-5">
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
            {cameraState === CameraState.DENY_ERROR && (
              <>
                <SmallTitleText as="p" align="center" className="px-4">
                  {t('onboarding.paritySigner.accessDeniedLabel')}
                </SmallTitleText>
                {(() => {
                  const platform = getPlatformType();
                  const settingsUrl =
                    platform === 'desktop-mac'
                      ? 'x-apple.systempreferences:com.apple.preference.security?Privacy_Camera'
                      : platform === 'desktop-windows'
                        ? 'ms-settings:privacy-webcam'
                        : null;

                  if (platform === 'web') {
                    return <p className="text-xs">{t('onboarding.paritySigner.accessDeniedDescriptionWeb')}</p>;
                  }

                  if (platform === 'desktop-linux') {
                    return (
                      <p className="text-xs">{t('onboarding.paritySigner.accessDeniedDescriptionDesktopLinux')}</p>
                    );
                  }

                  return (
                    <p className="text-xs">
                      {t('onboarding.paritySigner.allowCameraPrefix')}
                      {settingsUrl && (
                        <a
                          href={settingsUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={t('onboarding.paritySigner.systemSettingsAria')}
                          tabIndex={0}
                          className="text-primary outline-none hover:underline focus:underline"
                        >
                          {t('onboarding.paritySigner.systemSettings')}
                        </a>
                      )}
                      {t('onboarding.paritySigner.allowCameraSuffix')}
                    </p>
                  );
                })()}
              </>
            )}
            {cameraState === CameraState.NO_VIDEO_INPUT && (
              <>
                <SmallTitleText as="p" align="center" className="px-3">
                  {t('onboarding.paritySigner.noVideoInputLabel')}
                </SmallTitleText>
                <p className="text-xs">{t('onboarding.paritySigner.noVideoInputDescription')}</p>
              </>
            )}
            <Button
              className="mb-5 h-[32px] w-max"
              prefixElement={<Icon size={18} name="refresh" className="text-white" />}
              onClick={onRetryCamera}
            >
              {t('onboarding.paritySigner.tryAgainButton')}
            </Button>
          </div>
        </div>
      ) : (
        <div className={cnTw('relative overflow-hidden rounded-2lg', isCameraPending && 'hidden')} style={sizeStyle}>
          <QrReader
            size={size}
            cameraId={activeCamera}
            isError={isQrError}
            errorLabel={errorLabel}
            errorDescription={errorDescription}
            onCameraList={handleCameraList}
            onResult={decodeFrame}
            onError={onError}
            onTryAgain={onRetryCamera}
          />
        </div>
      )}

      {availableCameras.length > 1 && (
        <Select
          placeholder={t('onboarding.paritySigner.selectCameraLabel')}
          value={activeCamera ?? null}
          onChange={setActiveCamera}
        >
          {availableCameras.map((camera, index) => (
            <Select.Item key={camera.value} value={camera.value}>
              {`${index + 1}. ${camera.title}`}
            </Select.Item>
          ))}
        </Select>
      )}

      {totalFrames > 1 && (
        <div className="flex items-center justify-center gap-2">
          <FootnoteText className="text-text-tertiary">{t('qrReader.parsingLabel')}</FootnoteText>
          <CaptionText
            className={cnTw(
              'rounded-full bg-label-background-gray px-2 py-1 text-white uppercase',
              totalFrames === decodedFrames && 'bg-label-background-green',
            )}
          >
            {t('qrReader.parsingProgress', { decodedFrames, totalFrames })}
          </CaptionText>
        </div>
      )}
      <div className="flex w-full pb-4">
        <Button variant="text" onClick={onBack}>
          {t('onboarding.backButton')}
        </Button>
      </div>
    </div>
  );
};
