import { hexToU8a, isHex } from '@polkadot/util';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import cn from 'classnames';
import { useState } from 'react';

import { Button, CaptionText, FootnoteText, Icon, Loader, Select } from '@shared/ui';
import { type DropdownOption, type DropdownResult } from '@shared/ui/types';
import { useI18n } from '@app/providers';
import { cnTw } from '@shared/lib/utils';
import { type ErrorObject, QrError, QrReader, type SeedInfo, type VideoInput } from '@entities/transaction';
import { CryptoTypeString } from '@shared/core';

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
  const [activeCamera, setActiveCamera] = useState<DropdownResult<string>>();
  const [availableCameras, setAvailableCameras] = useState<DropdownOption<string>[]>([]);

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
    const formattedCameras = cameras.map((camera, index) => ({
      //eslint-disable-next-line i18next/no-literal-string
      element: `${index + 1}. ${camera.label}`,
      value: camera.id,
      id: camera.id,
    }));

    setAvailableCameras(formattedCameras);

    if (formattedCameras.length > 0) {
      setActiveCamera(formattedCameras[0]);
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
      qrPayload.forEach((qr) => {
        if (qr.multiSigner) {
          if (qr.multiSigner.MultiSigner !== CryptoTypeString.ECDSA) {
            encodeAddress(qr.multiSigner.public);
          }
        }
        if (qr.derivedKeys.length === 0) return;

        qr.derivedKeys.forEach(({ address }) => {
          const accountId = isHex(address) ? hexToU8a(address) : decodeAddress(address);

          return accountId.length === 20 ? address : encodeAddress(accountId);
        });
      });

      setIsScanComplete(true);
      setTimeout(() => onResult(qrPayload), RESULT_DELAY);
    } catch (error) {
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
      <div className="flex flex-col justify-center items-center w-full h-full">
        <div className="flex flex-col items-center justify-center text-center w-full h-full">
          {cameraState === CameraState.INVALID_ERROR && (
            <>
              <Icon className="text-alert" name="warnCutout" size={70} />
              <p className="text-neutral text-xl leading-6 font-semibold mt-5">
                {t('onboarding.paritySigner.wrongQRCodeLabel')}
              </p>
              <p className="text-neutral-variant text-sm max-w-[395px]">
                {t('onboarding.paritySigner.wrongQRCodeDescription')}
              </p>
            </>
          )}
          {cameraState === CameraState.UNKNOWN_ERROR && (
            <>
              <Icon className="text-alert" name="warnCutout" size={70} />
              <p className="text-neutral text-xl leading-6 font-semibold mt-5">
                {t('onboarding.paritySigner.notWorkingLabel')}
              </p>
              <p className="text-neutral-variant text-sm">{t('onboarding.paritySigner.notWorkingDescription')}</p>
            </>
          )}
          {cameraState === CameraState.DECODE_ERROR && (
            <>
              <Icon className="text-alert" name="warnCutout" size={70} />
              <p className="text-neutral text-xl leading-6 font-semibold mt-5">
                {t('onboarding.paritySigner.decodeErrorLabel')}
              </p>
              <p className="text-neutral-variant text-sm">{t('onboarding.paritySigner.decodeErrorDescription')}</p>
            </>
          )}
          {cameraState === CameraState.DENY_ERROR && (
            <>
              <Icon className="text-alert" name="warnCutout" size={70} />
              <p className="text-neutral text-xl leading-6 font-semibold mt-5">
                {t('onboarding.paritySigner.accessDeniedLabel')}
              </p>
              <p className="text-neutral-variant text-sm">{t('onboarding.paritySigner.accessDeniedDescription')}</p>
            </>
          )}
        </div>

        {[CameraState.UNKNOWN_ERROR, CameraState.DENY_ERROR, CameraState.DECODE_ERROR].includes(cameraState) && (
          <Button className="w-max mb-5" onClick={onRetryCamera}>
            {t('onboarding.paritySigner.tryAgainButton')}
          </Button>
        )}
        {cameraState === CameraState.INVALID_ERROR && (
          <Button className="w-max mb-5" onClick={onRetryCamera}>
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
        <div className="flex flex-col items-center w-full h-[288px]">
          <div className="relative flex items-center justify-center w-full h-full">
            <p className="absolute flex items-center gap-x-2.5 text-shade-40 font-semibold pb-3.5">
              <Loader color="primary" />
              {t('onboarding.paritySigner.startCameraLabel')}
            </p>
            <Icon className="absolute text-shade-12" name="qrFrame" size={240} />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className={cn('relative overflow-hidden', isCameraPending && 'hidden', className)} style={sizeStyle}>
          <QrReader
            size={size}
            cameraId={activeCamera?.value}
            bgVideo={true}
            className="relative top-[-24px] scale-y-[1.125] -scale-x-[1.125]"
            onStart={() => setCameraState(CameraState.ACTIVE)}
            onCameraList={onCameraList}
            onProgress={setProgress}
            onResult={(result) => onScanResult(result as SeedInfo[])}
            onError={onError}
          />

          <div className="absolute inset-0 flex items-center justify-center w-full h-full">
            {isScanComplete ? (
              <>
                <div className="backdrop-blur-sm rounded-2lg after:absolute after:inset-0 after:bg-white/50" />
                <Icon size={100} name="checkmarkCutout" className="text-success" />
              </>
            ) : (
              <Icon name="qrFrame" size={240} className="text-white z-20" />
            )}
          </div>
        </div>

        {availableCameras.length > 1 && (
          <Select
            placeholder={t('onboarding.paritySigner.selectCameraLabel')}
            selectedId={activeCamera?.id}
            options={availableCameras}
            onChange={setActiveCamera}
          />
        )}

        {total > 1 && (
          <div className="flex items-center justify-center gap-2">
            <FootnoteText className="text-text-tertiary">{t('qrReader.parsingLabel')}</FootnoteText>
            <CaptionText
              className={cnTw(
                'text-white uppercase bg-label-background-gray px-2 py-1 rounded-full',
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
