import { hexToU8a, isHex } from '@polkadot/util';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import { useState } from 'react';

import { CryptoTypeString } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { Button, CaptionText, FootnoteText, Icon, Loader } from '@/shared/ui';
import { type QrReaderCamera, QrReaderErrorCode, Select } from '@/shared/ui-kit';
import { type ErrorObject, type SeedInfo, VaultQrReader } from '@/entities/transaction';

const enum CameraState {
  ACTIVE,
  LOADING,
  SELECT,
  UNKNOWN_ERROR,
  INVALID_ERROR,
  MULTISHARD_ERROR,
  DECODE_ERROR,
  DENY_ERROR,
}

const RESULT_DELAY = 250;

type Props = {
  size?: number | [number, number];
  onComplete(payload: SeedInfo): void;
};

export const KeyQrReader = ({ size = 300, onComplete }: Props) => {
  const { t } = useI18n();

  const [cameraState, setCameraState] = useState<CameraState>(CameraState.LOADING);
  const [activeCamera, setActiveCamera] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<Record<'title' | 'value', string>[]>([]);

  const [isScanComplete, setIsScanComplete] = useState(false);
  const [{ decoded, total }, setProgress] = useState({ decoded: 0, total: 0 });

  const isCameraPending = CameraState.LOADING === cameraState;

  const isCameraError = [
    CameraState.UNKNOWN_ERROR,
    CameraState.INVALID_ERROR,
    CameraState.MULTISHARD_ERROR,
    CameraState.DECODE_ERROR,
    CameraState.DENY_ERROR,
  ].includes(cameraState);

  const onCameraList = (cameras: QrReaderCamera[]) => {
    const formattedCameras = cameras.map(camera => ({
      title: camera.label,
      value: camera.deviceId,
    }));

    setAvailableCameras(formattedCameras);

    const defaultCamera = formattedCameras.at(0);
    if (defaultCamera) {
      setActiveCamera(defaultCamera.value);
      setCameraState(CameraState.ACTIVE);
    }
  };

  // FIXME: camera is blocked after 3 denies (that's intended browser reaction)
  // Set attempts counter and show special notification
  const onRetryCamera = () => {
    setCameraState(CameraState.LOADING);
  };

  const resetCamera = () => {
    setActiveCamera(null);
    setProgress({ decoded: 0, total: 0 });
  };

  const onScanResult = (qrPayload: SeedInfo[]) => {
    if (qrPayload.length > 1) {
      setCameraState(CameraState.MULTISHARD_ERROR);
      resetCamera();
      return;
    }

    try {
      const qr = qrPayload[0];

      if (qr.multiSigner && qr.multiSigner.MultiSigner !== CryptoTypeString.ECDSA) {
        encodeAddress(qr.multiSigner.public);
      }

      // Validate each derived key, decodeAddress & encodeAddress can throw
      for (const { address } of qr.derivedKeys) {
        const accountId = isHex(address) ? hexToU8a(address) : decodeAddress(address);
        if (accountId.length === 20) continue;
        encodeAddress(accountId);
      }

      setIsScanComplete(true);
      setTimeout(() => onComplete(qr), RESULT_DELAY);
    } catch {
      setCameraState(CameraState.INVALID_ERROR);
      resetCamera();
    }
  };

  const onError = (error: ErrorObject) => {
    if (error.code === QrReaderErrorCode.USER_DENY) {
      setCameraState(CameraState.DENY_ERROR);
    } else if (error.code === QrReaderErrorCode.DECODE_ERROR) {
      setCameraState(CameraState.DECODE_ERROR);
    } else {
      setCameraState(CameraState.UNKNOWN_ERROR);
    }

    resetCamera();
  };

  if (isCameraError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2">
        <div className="flex h-full w-full flex-col items-center justify-center text-center">
          {cameraState === CameraState.INVALID_ERROR && (
            <>
              <Icon className="text-alert" name="warnCutout" size={70} />
              <p className="mt-5 text-xl leading-6 font-semibold text-neutral">
                {t('onboarding.paritySigner.wrongQRCodeLabel')}
              </p>
              <p className="max-w-[395px] text-sm text-neutral-variant">
                {t('onboarding.paritySigner.wrongQRCodeDescription')}
              </p>
            </>
          )}
          {cameraState === CameraState.MULTISHARD_ERROR && (
            <>
              <Icon className="text-alert" name="warnCutout" size={70} />
              <p className="mt-5 text-xl leading-6 font-semibold text-neutral">
                {t('onboarding.paritySigner.multishardQRCodeLabel')}
              </p>
              <p className="max-w-[395px] text-sm text-neutral-variant">
                {t('onboarding.paritySigner.multishardQRCodeDescription')}
              </p>
            </>
          )}
          {cameraState === CameraState.UNKNOWN_ERROR && (
            <>
              <Icon className="text-alert" name="warnCutout" size={70} />
              <p className="mt-5 text-xl leading-6 font-semibold text-neutral">
                {t('onboarding.paritySigner.notWorkingLabel')}
              </p>
              <p className="text-sm text-neutral-variant">{t('onboarding.paritySigner.notWorkingDescription')}</p>
            </>
          )}
          {cameraState === CameraState.DECODE_ERROR && (
            <>
              <Icon className="text-alert" name="warnCutout" size={70} />
              <p className="mt-5 text-xl leading-6 font-semibold text-neutral">
                {t('onboarding.paritySigner.decodeErrorLabel')}
              </p>
              <p className="text-sm text-neutral-variant">{t('onboarding.paritySigner.decodeErrorDescription')}</p>
            </>
          )}
          {cameraState === CameraState.DENY_ERROR && (
            <>
              <Icon className="text-alert" name="warnCutout" size={70} />
              <p className="mt-5 text-xl leading-6 font-semibold text-neutral">
                {t('onboarding.paritySigner.accessDeniedLabel')}
              </p>
              <p className="text-sm text-neutral-variant">{t('onboarding.paritySigner.accessDeniedDescription')}</p>
            </>
          )}
        </div>

        {[CameraState.UNKNOWN_ERROR, CameraState.DENY_ERROR, CameraState.DECODE_ERROR].includes(cameraState) && (
          <Button className="mb-5 w-max" onClick={onRetryCamera}>
            {t('onboarding.paritySigner.tryAgainButton')}
          </Button>
        )}
        {cameraState === CameraState.INVALID_ERROR && (
          <Button className="mb-5 w-max" onClick={onRetryCamera}>
            {t('onboarding.paritySigner.scanAgainButton')}
          </Button>
        )}
      </div>
    );
  }

  const sizeStyle = Array.isArray(size) ? { width: size[0], height: size[1] } : { width: size, height: size };

  return (
    <>
      {cameraState === CameraState.LOADING && (
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

      <div className="flex flex-col gap-4">
        <div className={cnTw('relative overflow-hidden rounded-2lg', isCameraPending && 'hidden')} style={sizeStyle}>
          <VaultQrReader
            size={size}
            cameraId={activeCamera}
            onCameraList={onCameraList}
            onProgress={setProgress}
            onResult={result => onScanResult(result as SeedInfo[])}
            onError={onError}
          />

          <div className="absolute inset-0 flex h-full w-full items-center justify-center">
            {isScanComplete ? (
              <>
                <div className="rounded-2lg backdrop-blur-xs after:absolute after:inset-0 after:bg-white/50" />
                <Icon size={100} name="checkmarkCutout" className="text-success" />
              </>
            ) : null}
          </div>
        </div>

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

        {total > 1 && (
          <div className="flex items-center justify-center gap-2">
            <FootnoteText className="text-text-tertiary">{t('qrReader.parsingLabel')}</FootnoteText>
            <CaptionText
              className={cnTw(
                'rounded-full bg-label-background-gray px-2 py-1 text-white uppercase',
                total === decoded && 'bg-label-background-green',
              )}
            >
              {t('qrReader.parsingProgress', { decoded, total })}
            </CaptionText>
          </div>
        )}
      </div>
    </>
  );
};
