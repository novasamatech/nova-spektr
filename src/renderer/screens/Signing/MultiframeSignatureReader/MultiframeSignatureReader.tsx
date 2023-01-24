import cn from 'classnames';
import { useState } from 'react';

import { ErrorObject, QrError, VideoInput } from '@renderer/components/common/QrCode/QrReader/common/types';
import { Button, Dropdown, Icon } from '@renderer/components/ui';
import { Option, ResultOption } from '@renderer/components/ui/Dropdowns/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { secondsToMinutes } from '../common/utils';
import { ValidationErrors } from '@renderer/screens/Transfer/common/constants';
import QrMultiframeSignatureReader from '@renderer/components/common/QrCode/QrReader/QrMultiframeSignatureReader';
import { HexString } from '@renderer/domain/shared-kernel';

const enum CameraState {
  ACTIVE,
  LOADING,
  SELECT,
  UNKNOWN_ERROR,
  INVALID_ERROR,
  DECODE_ERROR,
  DENY_ERROR,
  EXPIRED_ERROR,
}

const RESULT_DELAY = 250;

type Props = {
  size?: number;
  className?: string;
  onResult: (payload: HexString[]) => void;
  countdown?: number;
  validationError?: ValidationErrors;
};

const MultiframeSignatureReader = ({ size = 300, className, onResult, countdown, validationError }: Props) => {
  const { t } = useI18n();

  const [cameraState, setCameraState] = useState<CameraState>(CameraState.LOADING);
  const [activeCamera, setActiveCamera] = useState<ResultOption<string>>();
  const [availableCameras, setAvailableCameras] = useState<Option<string>[]>([]);

  const [isScanComplete, setIsScanComplete] = useState(false);

  const isCameraPending = [CameraState.LOADING, CameraState.SELECT].includes(cameraState);

  const isCameraError = [
    CameraState.UNKNOWN_ERROR,
    CameraState.INVALID_ERROR,
    CameraState.DECODE_ERROR,
    CameraState.DENY_ERROR,
    CameraState.EXPIRED_ERROR,
  ].includes(cameraState);

  const onCameraList = (cameras: VideoInput[]) => {
    const formattedCameras = cameras.map((camera, index) => ({
      //eslint-disable-next-line i18next/no-literal-string
      element: `${index + 1}. ${camera.label}`,
      value: camera.id,
      id: camera.id,
    }));

    setAvailableCameras(formattedCameras);
    setCameraState(CameraState.SELECT);
  };

  // FIXME: camera is blocked after 3 denies (that's intended browser reaction)
  // Set attempts counter and show special notification
  const onRetryCamera = () => {
    setCameraState(CameraState.LOADING);
  };

  const onScanResult = (signatures: HexString[]) => {
    if (countdown === 0) {
      setIsScanComplete(true);
      setCameraState(CameraState.EXPIRED_ERROR);

      return;
    }

    try {
      setIsScanComplete(true);
      setTimeout(() => onResult(signatures), RESULT_DELAY);
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
          {cameraState === CameraState.EXPIRED_ERROR && (
            <>
              <Icon className="text-alert" name="warnCutout" size={70} />
              <p className="text-neutral text-xl leading-6 font-semibold mt-5">{t('signing.signatureExpiredLabel')}</p>
              <p className="text-neutral-variant text-sm">{t('signing.signatureExpiredDescription')}</p>
            </>
          )}
        </div>

        {[CameraState.UNKNOWN_ERROR, CameraState.DENY_ERROR, CameraState.DECODE_ERROR].includes(cameraState) && (
          <Button className="w-max mb-5" weight="lg" variant="fill" pallet="primary" onClick={onRetryCamera}>
            {t('onboarding.paritySigner.tryAgainButton')}
          </Button>
        )}
        {cameraState === CameraState.INVALID_ERROR && (
          <Button
            className="w-max mb-5"
            weight="lg"
            variant="fill"
            pallet="primary"
            onClick={() => setCameraState(CameraState.ACTIVE)}
          >
            {t('onboarding.paritySigner.scanAgainButton')}
          </Button>
        )}
      </div>
    );
  }

  if (validationError) {
    return (
      <div className="flex flex-col justify-center items-center w-full h-full">
        <div className="flex flex-col items-center justify-center text-center w-full h-full">
          {validationError === ValidationErrors.INSUFFICIENT_BALANCE && (
            <>
              <Icon className="text-alert" name="warnCutout" size={70} />
              <p className="text-neutral text-xl leading-6 font-semibold mt-5">{t('transfer.notEnoughBalanceError')}</p>
            </>
          )}
          {validationError === ValidationErrors.INSUFFICIENT_BALANCE_FOR_FEE && (
            <>
              <Icon className="text-alert" name="warnCutout" size={70} />
              <p className="text-neutral text-xl leading-6 font-semibold mt-5">
                {t('transfer.notEnoughBalanceForFeeError')}
              </p>
            </>
          )}
        </div>
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
              activeId={activeCamera?.id}
              options={availableCameras}
              onChange={setActiveCamera}
            />
          </div>
        </div>
      )}

      <div className={cn('relative bg-shade-40', isCameraPending && 'hidden', className)}>
        <QrMultiframeSignatureReader
          size={size}
          className={className}
          cameraId={activeCamera?.value}
          onStart={() => setCameraState(CameraState.ACTIVE)}
          onCameraList={onCameraList}
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
          <Icon
            name="qrFrame"
            size={250}
            className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 text-white"
          />
        )}

        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 w-[calc(100%-20px)] p-[15px] rounded-lg bg-white">
          {countdown && countdown > 0 ? (
            <div className="flex m-auto items-center justify-center uppercase font-normal text-xs gap-1.25">
              {t('signing.qrCountdownTitle')}
              <div className={cn('rounded-md text-white py-0.5 px-1.5', countdown > 60 ? 'bg-success' : 'bg-alert')}>
                {secondsToMinutes(countdown || 0)}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-error text-xl text-center leading-6 font-semibold">
                {t('signing.signatureExpiredLabel')}
              </p>
              <p className="text-neutral-variant text-center text-sm">{t('signing.signatureExpiredDescription')}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MultiframeSignatureReader;
