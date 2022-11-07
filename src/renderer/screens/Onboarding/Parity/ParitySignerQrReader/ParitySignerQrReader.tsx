import { hexToU8a, isHex } from '@polkadot/util';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import cn from 'classnames';
import { useState } from 'react';

import { QrReader } from '@renderer/components/common';
import { ErrorObject, QrError, SeedInfo, VideoInput } from '@renderer/components/common/QrCode/QrReader/common/types';
import { Button, Dropdown, Icon } from '@renderer/components/ui';
import { OptionType } from '@renderer/components/ui/Dropdown/common/types';
import { useI18n } from '@renderer/context/I18nContext';

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
  size?: number;
  className?: string;
  onResult: (payload: SeedInfo[]) => void;
};

const ParitySignerQrReader = ({ size = 300, className, onResult }: Props) => {
  const { t } = useI18n();

  const [cameraState, setCameraState] = useState<CameraState>(CameraState.LOADING);
  const [activeCamera, setActiveCamera] = useState<OptionType>();
  const [availableCameras, setAvailableCameras] = useState<OptionType[]>([]);

  const [isScanComplete, setIsScanComplete] = useState(false);
  const [{ decoded, total }, setProgress] = useState({ decoded: 0, total: 0 });

  const isCameraPending = [CameraState.LOADING, CameraState.SELECT].includes(cameraState);

  const isCameraError = [
    CameraState.UNKNOWN_ERROR,
    CameraState.INVALID_ERROR,
    CameraState.DECODE_ERROR,
    CameraState.DENY_ERROR,
  ].includes(cameraState);

  const onCameraList = (cameras: VideoInput[]) => {
    const formattedCameras = cameras.map((camera, index) => ({
      //eslint-disable-next-line i18next/no-literal-string
      label: `${index + 1}. ${camera.label}`,
      value: camera.id,
    }));

    setAvailableCameras(formattedCameras);
    setCameraState(CameraState.SELECT);
  };

  // FIXME: camera is blocked after 3 denies (that's intended browser reaction)
  // Set attempts counter and show special notification
  const onRetryCamera = () => {
    setCameraState(CameraState.LOADING);
  };

  const onScanResult = (qrPayload: SeedInfo[]) => {
    try {
      qrPayload.forEach((qr) => {
        encodeAddress(qr.multiSigner?.public || '');
        if (qr.derivedKeys.length === 0) return;

        qr.derivedKeys.forEach(({ address }) =>
          encodeAddress(isHex(address) ? hexToU8a(address) : decodeAddress(address)),
        );
      });

      setIsScanComplete(true);
      setTimeout(() => onResult(qrPayload), RESULT_DELAY);
    } catch (error) {
      setCameraState(CameraState.INVALID_ERROR);
      setActiveCamera(undefined);
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

    setActiveCamera(undefined);
    setProgress({ decoded: 0, total: 0 });
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
          <Button className="w-max mb-5" weight="lg" variant="fill" pallet="primary" onClick={onRetryCamera}>
            {t('onboarding.paritySigner.tryAgainButton')}
          </Button>
        )}
        {cameraState === CameraState.INVALID_ERROR && (
          <Button className="w-max mb-5" weight="lg" variant="fill" pallet="primary" onClick={onRetryCamera}>
            {t('onboarding.paritySigner.scanAgainButton')}
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      {cameraState === CameraState.LOADING && (
        <div className="flex flex-col items-center w-full h-full">
          <div className="relative flex items-center justify-center w-full h-full">
            <Icon className="absolute text-shade-10" name="qrSimple" size={70} />
            <Icon className="absolute text-shade-10" name="qrFrame" size={250} />
          </div>
          <p className="flex items-center gap-x-2.5 text-shade-40 font-semibold pb-3.5">
            <Icon name="loader" className="animate-spin" /> {t('onboarding.paritySigner.startCameraLabel')}
          </p>
        </div>
      )}
      {cameraState === CameraState.SELECT && (
        <div className="flex flex-col items-center w-full h-full">
          <div className="flex items-center justify-center bg-white w-full h-full">
            <div className="flex flex-col items-center text-center">
              <Icon className="text-alert" name="warnCutout" size={70} />
              <p className="text-neutral text-xl leading-6 font-semibold mt-5">
                {t('onboarding.paritySigner.multipleCamerasLabel')}
              </p>
              <p className="text-neutral-variant text-sm">{t('onboarding.paritySigner.chooseCameraLabel')}</p>
            </div>
          </div>
          <div className="mb-5 w-[242px]">
            <Dropdown
              placeholder={t('onboarding.paritySigner.selectCameraLabel')}
              selected={activeCamera}
              options={availableCameras}
              onSelected={setActiveCamera}
            />
          </div>
        </div>
      )}

      <div className={cn('relative bg-shade-40', isCameraPending && 'hidden', className)}>
        <QrReader
          size={size}
          className={className}
          cameraId={activeCamera?.value}
          onStart={() => setCameraState(CameraState.ACTIVE)}
          onCameraList={onCameraList}
          onProgress={setProgress}
          onResult={onScanResult}
          onError={onError}
        />
        {isScanComplete ? (
          <>
            <div className="absolute inset-0 backdrop-blur-sm rounded-2lg after:absolute after:inset-0 after:bg-white/50" />
            <Icon
              size={100}
              name="checkmarkCutout"
              className="absolute left-1/2 top-40 -translate-x-1/2 text-success"
            />
          </>
        ) : (
          <Icon name="qrFrame" size={250} className="absolute left-1/2 top-20 -translate-x-1/2 text-white" />
        )}
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 w-[calc(100%-20px)] p-[15px] pb-6 rounded-lg bg-white">
          <div className="grid grid-flow-col grid-rows-2">
            <p className="text-2xs text-neutral">{t('qrReader.parsingLabel')}</p>
            <p className="text-2xs text-shade-40">{t('qrReader.parsingSubLabel')}</p>
            <p
              className="row-span-2 self-center justify-self-end text-lg leading-6 text-shade-40"
              data-testid="progress"
            >
              <span className={cn(decoded > 0 ? 'text-success' : 'text-shade-40')}>{decoded}</span>
              {/* eslint-disable-next-line i18next/no-literal-string */}
              <span className={cn(decoded > 0 && decoded === total && 'text-success')}> / {total}</span>
            </p>
          </div>
          <div className="relative mt-2">
            <div className="absolute top-0 left-0 h-2 w-full border-2 border-shade-20 rounded-2lg" />
            <div
              className="absolute top-0 left-0 h-2 bg-neutral rounded-2lg transition-[width]"
              style={{ width: (decoded / total || 0) * 100 + '%' }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default ParitySignerQrReader;
