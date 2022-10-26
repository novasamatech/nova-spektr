import { hexToU8a, isHex } from '@polkadot/util';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import cn from 'classnames';
import { useState } from 'react';

import ScanQr from '@images/misc/onboarding/scan-qr.svg';
import { ErrorObject, QrError, SeedInfo, VideoInput } from '@renderer/components/common/QrCode/QrReader/common/types';
import { Button, Dropdown, Icon } from '@renderer/components/ui';
import { OptionType } from '@renderer/components/ui/Dropdown/Dropdown';
import { useI18n } from '@renderer/context/I18nContext';
import ParitySignerQrReader from '../ParitySignerQrReader/ParitySignerQrReader';

const enum CameraState {
  LOADING,
  SELECT,
  ERROR,
  BAD_CODE,
  DENY,
  ON,
}

type Props = {
  onNextStep: (payload: SeedInfo) => void;
};

const StepTwo = ({ onNextStep }: Props) => {
  const { t } = useI18n();

  const [cameraState, setCameraState] = useState<CameraState>(CameraState.LOADING);
  const [isCameraExist, setIsCameraExist] = useState(true);
  const [activeCamera, setActiveCamera] = useState<OptionType>();
  const [availableCameras, setAvailableCameras] = useState<OptionType[]>([]);

  const onScanResult = (qrPayload: SeedInfo) => {
    console.log(qrPayload);
    try {
      if (qrPayload.derivedKeys.length > 0) {
        qrPayload.derivedKeys.forEach(({ address }) =>
          encodeAddress(isHex(address) ? hexToU8a(address) : decodeAddress(address)),
        );
      }

      encodeAddress(qrPayload.multiSigner?.public || '');
      setTimeout(() => onNextStep(qrPayload), 200);
    } catch (error) {
      setCameraState(CameraState.BAD_CODE);
      setIsCameraExist(false);
      setActiveCamera(undefined);
    }
  };

  const onError = (error: ErrorObject) => {
    if (error.code === QrError.USER_DENY) {
      setCameraState(CameraState.DENY);
    } else {
      setCameraState(CameraState.ERROR);
    }

    setIsCameraExist(false);
    setActiveCamera(undefined);
  };

  const onCameraStart = () => {
    setCameraState(CameraState.ON);
  };

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
    setIsCameraExist(true);
    setCameraState(CameraState.LOADING);
  };

  const onRetryScan = () => {
    setIsCameraExist(true);
    setCameraState(CameraState.ON);
  };

  return (
    <div className="flex rounded-2lg bg-shade-2">
      <div className="flex-1">
        <img src={ScanQr} alt={t('oboarding.paritysigner.scanQRCodeAlt')} width={500} height={440} />
        <h2 className="text-neutral-variant text-center py-5 px-10 leading-5">
          {t('onboarding.paritysigner.scanQRLabel1')}{' '}
          <span className="font-bold">{t('onboarding.paritysigner.scanQRLabel2')}</span>{' '}
          {t('onboarding.paritysigner.scanQRLabel3')}
        </h2>
      </div>
      <div className="relative flex flex-col justify-center items-center flex-1 shadow-surface rounded-2lg bg-white overflow-hidden">
        {cameraState !== CameraState.ON && (
          <div className="flex items-center justify-center bg-white w-full h-full">
            {cameraState === CameraState.SELECT && (
              <div className="flex flex-col items-center text-center">
                <Icon className="text-alert" as="svg" name="warnCutout" size={70} />
                <p className="text-neutral text-xl leading-6 font-semibold mt-5">
                  {t('onboarding.paritysigner.multipleCamerasLabel')}
                </p>
                <p className="text-neutral-variant text-sm">{t('onboarding.paritysigner.chooseCameraLabel')}</p>
              </div>
            )}
            {cameraState === CameraState.BAD_CODE && (
              <div className="flex flex-col items-center text-center">
                <Icon className="text-alert" as="svg" name="warnCutout" size={70} />
                <p className="text-neutral text-xl leading-6 font-semibold mt-5">
                  {t('onboarding.paritysigner.wrongQRCodeLabel')}
                </p>
                <p className="text-neutral-variant text-sm max-w-[395px]">
                  {t('onboarding.paritysigner.wrongQRCodeDescription')}
                </p>
              </div>
            )}
            {cameraState === CameraState.ERROR && (
              <div className="flex flex-col items-center text-center">
                <Icon className="text-alert" as="svg" name="warnCutout" size={70} />
                <p className="text-neutral text-xl leading-6 font-semibold mt-5">
                  {t('onboarding.paritysigner.cameraNotWorkLabel')}
                </p>
                <p className="text-neutral-variant text-sm">{t('onboarding.paritysigner.cameraNotWorkDescription')}</p>
              </div>
            )}
            {cameraState === CameraState.DENY && (
              <div className="flex flex-col items-center text-center">
                <Icon className="text-alert" as="svg" name="warnCutout" size={70} />
                <p className="text-neutral text-xl leading-6 font-semibold mt-5">
                  {t('onboarding.paritysigner.cameraAccessDeniedLabel')}
                </p>
                <p className="text-neutral-variant text-sm">
                  {t('onboarding.paritysigner.cameraAccessDeniedDescription')}
                </p>
              </div>
            )}
            {cameraState === CameraState.LOADING && (
              <>
                <Icon className="absolute text-shade-10" as="svg" name="qrSimple" size={70} />
                <Icon className="absolute text-shade-10" as="svg" name="qrFrame" size={250} />
              </>
            )}
          </div>
        )}

        {isCameraExist && (
          <div className={cn(cameraState !== CameraState.ON && 'hidden')}>
            <ParitySignerQrReader
              size={500}
              cameraId={activeCamera?.value}
              onCameraList={onCameraList}
              onResult={onScanResult}
              onStart={onCameraStart}
              onError={onError}
            />
          </div>
        )}

        {cameraState === CameraState.LOADING && (
          <p className="flex items-center gap-x-2.5 text-shade-40 font-semibold pb-3.5">
            <Icon as="svg" name="loader" className="animate-spin" /> {t('onboarding.paritysigner.startingCameraLabel')}
          </p>
        )}
        {cameraState === CameraState.SELECT && (
          <div className="w-[242px]">
            <Dropdown
              placeholder={t('onboarding.paritysigner.selectCameraLabel')}
              selected={activeCamera}
              options={availableCameras}
              onSelected={setActiveCamera}
            />
          </div>
        )}
        {[CameraState.ERROR, CameraState.DENY].includes(cameraState) && (
          <Button className="w-max mb-5" weight="lg" variant="fill" pallet="primary" onClick={onRetryCamera}>
            {t('onboarding.paritysigner.cameraErrorTryAgainLabel')}
          </Button>
        )}
        {cameraState === CameraState.BAD_CODE && (
          <Button className="w-max mb-5" weight="lg" variant="fill" pallet="primary" onClick={onRetryScan}>
            {t('onboarding.paritysigner.cameraScanAgainButton')}
          </Button>
        )}
      </div>
    </div>
  );
};

export default StepTwo;
