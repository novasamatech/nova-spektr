import { hexToU8a, isHex } from '@polkadot/util';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import { useState } from 'react';

import { CryptoTypeString } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { Button, CaptionText, FootnoteText, Icon, Loader } from '@/shared/ui';
import { Select } from '@/shared/ui-kit';
import { type ErrorObject, QrError, QrReader, type SeedInfo, type VideoInput } from '@/entities/transaction';

const enum CameraState {
  ACTIVE,
  LOADING,
  SELECT,
  UNKNOWN_ERROR,
  INVALID_ERROR,
  DECODE_ERROR,
  DENY_ERROR,
}

const RESULT_DELAY = 250;

type Props = {
  size?: number | [number, number];
  className?: string;
  onResult: (payload: SeedInfo[]) => void;
};

const KeyQrReader = ({ size = 300, className, onResult }: Props) => {
  const { t } = useI18n();

  const [cameraState, setCameraState] = useState<CameraState>(CameraState.LOADING);
  const [activeCamera, setActiveCamera] = useState<string>();
  const [availableCameras, setAvailableCameras] = useState<Record<'title' | 'value', string>[]>([]);

  const [isScanComplete, setIsScanComplete] = useState(false);
  const [{ decoded, total }, setProgress] = useState({ decoded: 0, total: 0 });

  const isCameraPending = CameraState.LOADING === cameraState;

  const isCameraError = [
    CameraState.UNKNOWN_ERROR,
    CameraState.INVALID_ERROR,
    CameraState.DECODE_ERROR,
    CameraState.DENY_ERROR,
  ].includes(cameraState);

  const onCameraList = (cameras: VideoInput[]) => {
    const formattedCameras = cameras.map((camera) => ({
      title: camera.label,
      value: camera.id,
    }));

    setAvailableCameras(formattedCameras);

    if (formattedCameras.length > 0) {
      setActiveCamera(formattedCameras[0].value);
      setCameraState(CameraState.ACTIVE);
    }
  };

  // FIXME: camera is blocked after 3 denies (that's intended browser reaction)
  // Set attempts counter and show special notification
  const onRetryCamera = () => {
    setCameraState(CameraState.LOADING);
  };

  const resetCamera = () => {
    setActiveCamera(undefined);
    setProgress({ decoded: 0, total: 0 });
  };

  const onScanResult = (qrPayload: SeedInfo[]) => {
    try {
      for (const qr of qrPayload) {
        if (qr.multiSigner && qr.multiSigner.MultiSigner !== CryptoTypeString.ECDSA) {
          encodeAddress(qr.multiSigner.public);
        }
        if (qr.derivedKeys.length === 0) continue;

        // TODO what is this?
        // eslint-disable-next-line no-restricted-syntax
        qr.derivedKeys.forEach(({ address }) => {
          const accountId = isHex(address) ? hexToU8a(address) : decodeAddress(address);

          return accountId.length === 20 ? address : encodeAddress(accountId);
        });
      }

      setIsScanComplete(true);
      setTimeout(() => onResult(qrPayload), RESULT_DELAY);
    } catch {
      setCameraState(CameraState.INVALID_ERROR);
      resetCamera();
    }
  };

  const onError = (error: ErrorObject) => {
    if (error.code === QrError.USER_DENY) {
      setCameraState(CameraState.DENY_ERROR);
    } else if (error.code === QrError.DECODE_ERROR) {
      setCameraState(CameraState.DECODE_ERROR);
    } else {
      setCameraState(CameraState.UNKNOWN_ERROR);
    }

    resetCamera();
  };

  if (isCameraError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center">
        <div className="flex h-full w-full flex-col items-center justify-center text-center">
          {cameraState === CameraState.INVALID_ERROR && (
            <>
              <Icon className="text-alert" name="warnCutout" size={70} />
              <p className="mt-5 text-xl font-semibold leading-6 text-neutral">
                {t('onboarding.paritySigner.wrongQRCodeLabel')}
              </p>
              <p className="max-w-[395px] text-sm text-neutral-variant">
                {t('onboarding.paritySigner.wrongQRCodeDescription')}
              </p>
            </>
          )}
          {cameraState === CameraState.UNKNOWN_ERROR && (
            <>
              <Icon className="text-alert" name="warnCutout" size={70} />
              <p className="mt-5 text-xl font-semibold leading-6 text-neutral">
                {t('onboarding.paritySigner.notWorkingLabel')}
              </p>
              <p className="text-sm text-neutral-variant">{t('onboarding.paritySigner.notWorkingDescription')}</p>
            </>
          )}
          {cameraState === CameraState.DECODE_ERROR && (
            <>
              <Icon className="text-alert" name="warnCutout" size={70} />
              <p className="mt-5 text-xl font-semibold leading-6 text-neutral">
                {t('onboarding.paritySigner.decodeErrorLabel')}
              </p>
              <p className="text-sm text-neutral-variant">{t('onboarding.paritySigner.decodeErrorDescription')}</p>
            </>
          )}
          {cameraState === CameraState.DENY_ERROR && (
            <>
              <Icon className="text-alert" name="warnCutout" size={70} />
              <p className="mt-5 text-xl font-semibold leading-6 text-neutral">
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
        <div className={cnTw('relative overflow-hidden', isCameraPending && 'hidden', className)} style={sizeStyle}>
          <QrReader
            bgVideo
            size={size}
            cameraId={activeCamera}
            className="relative top-[-24px] -scale-x-[1.125] scale-y-[1.125]"
            onStart={() => setCameraState(CameraState.ACTIVE)}
            onCameraList={onCameraList}
            onProgress={setProgress}
            onResult={(result) => onScanResult(result as SeedInfo[])}
            onError={onError}
          />

          <div className="absolute inset-0 flex h-full w-full items-center justify-center">
            {isScanComplete ? (
              <>
                <div className="rounded-2lg backdrop-blur-sm after:absolute after:inset-0 after:bg-white/50" />
                <Icon size={100} name="checkmarkCutout" className="text-success" />
              </>
            ) : (
              <Icon name="qrFrame" size={240} className="z-20 text-white" />
            )}
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
                'rounded-full bg-label-background-gray px-2 py-1 uppercase text-white',
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

export default KeyQrReader;
