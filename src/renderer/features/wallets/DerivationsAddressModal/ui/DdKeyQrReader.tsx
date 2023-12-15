import { hexToU8a, isHex } from '@polkadot/util';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import { useState } from 'react';

import { QrReader } from '@renderer/components/common';
import { Icon, Loader, Button, CaptionText, FootnoteText, Select, SmallTitleText } from '@shared/ui';
import { DropdownOption, DropdownResult } from '@shared/ui/Dropdowns/common/types';
import { useI18n } from '@app/providers';
import { cnTw } from '@shared/lib/utils';
import { WhiteTextButtonStyle } from '@renderer/components/common/QrCode/common/constants';
import {
  DdAddressInfoDecoded,
  DdSeedInfo,
  ErrorObject,
  QrError,
  VideoInput,
} from '@renderer/components/common/QrCode/common/types';

const enum CameraState {
  ACTIVE,
  LOADING,
  SELECT,
  UNKNOWN_ERROR,
  INVALID_ERROR,
  DECODE_ERROR,
  DENY_ERROR,
}

const CameraAccessErrors = [CameraState.UNKNOWN_ERROR, CameraState.DENY_ERROR, CameraState.DECODE_ERROR];

const RESULT_DELAY = 250;

type Props = {
  size?: number | [number, number];
  className?: string;
  onGoBack: () => void;
  onResult: (payload: DdAddressInfoDecoded[]) => void;
};

export const DdKeyQrReader = ({ size = 300, className, onGoBack, onResult }: Props) => {
  const { t } = useI18n();

  const [cameraState, setCameraState] = useState<CameraState>(CameraState.LOADING);
  const [activeCamera, setActiveCamera] = useState<DropdownResult<string>>();
  const [availableCameras, setAvailableCameras] = useState<DropdownOption<string>[]>([]);

  const [isScanComplete, setIsScanComplete] = useState(false);
  const [{ decoded, total }, setProgress] = useState({ decoded: 0, total: 0 });

  const isCameraPending = CameraState.LOADING === cameraState;
  const isCameraOn = !isCameraPending && !CameraAccessErrors.includes(cameraState);

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

  const onScanResult = (qrPayload: DdSeedInfo[]) => {
    try {
      const derivations: DdAddressInfoDecoded[] = [];
      qrPayload.forEach((qr) => {
        if (qr.multiSigner) {
          // Run encodeAddress to check we got valid address for public key
          encodeAddress(qr.multiSigner.public);
        }

        if (qr.dynamicDerivations.length === 0) return;

        const derivationsAddressInfo = qr.dynamicDerivations.map((addressInfo) => ({
          ...addressInfo,
          publicKey: {
            MultiSigner: addressInfo.publicKey.MultiSigner,
            public: encodeAddress(
              isHex(addressInfo.publicKey.public)
                ? hexToU8a(addressInfo.publicKey.public)
                : decodeAddress(addressInfo.publicKey.public),
            ),
          },
        }));

        derivations.push(...derivationsAddressInfo);
      });

      setIsScanComplete(true);
      setTimeout(() => onResult(derivations), RESULT_DELAY);
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
            <Icon className="absolute text-shade-10" name="qrFrame" size={240} />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div
          className={cnTw('relative overflow-hidden rounded-b-lg', isCameraPending && 'hidden', className)}
          style={sizeStyle}
        >
          <SmallTitleText
            as="h3"
            align="center"
            className={cnTw('absolute w-full mt-4 z-10', isCameraOn && 'text-white')}
          >
            {t('onboarding.vault.scanTitle')}
          </SmallTitleText>
          <QrReader
            size={size}
            cameraId={activeCamera?.value}
            isDynamicDerivations
            bgVideo
            className="relative top-[-24px] scale-y-[1.125] -scale-x-[1.125]"
            wrapperClassName="translate-y-[-84px]"
            onStart={() => setCameraState(CameraState.ACTIVE)}
            onCameraList={onCameraList}
            onProgress={setProgress}
            onResult={(result) => onScanResult(result as DdSeedInfo[])}
            onError={onError}
          />

          <div className="h-8.5 w-full flex justify-center z-10 absolute bottom-[138px]">
            {availableCameras && availableCameras.length > 1 && (
              <Select
                theme="dark"
                placeholder={t('onboarding.paritySigner.selectCameraLabel')}
                selectedId={activeCamera?.id}
                options={availableCameras}
                className="w-[208px]"
                onChange={setActiveCamera}
              />
            )}
          </div>

          <div className="absolute inset-0 flex justify-center w-full h-full mt-[58px]">
            {isScanComplete ? (
              <>
                <div className="backdrop-blur-sm rounded-2lg after:absolute after:inset-0 after:bg-white/50" />
                <Icon size={100} name="checkmarkCutout" className="text-success" />
              </>
            ) : (
              <Icon name="qrFrame" size={240} className="text-white z-20" />
            )}
          </div>

          <footer className="flex w-full justify-between items-center h-[66px] px-5 z-10 absolute bottom-0">
            <Button
              variant="text"
              className={cnTw('h-6.5 px-4', isCameraOn ? WhiteTextButtonStyle : '')}
              onClick={onGoBack}
            >
              {t('operation.goBackButton')}
            </Button>

            {total > 1 && (
              <div className="flex items-center gap-x-2 z-10 p-1.5 pl-3 rounded-2xl bg-black-background">
                <FootnoteText className="text-text-tertiary">{t('signing.parsingLabel')}</FootnoteText>
                <CaptionText
                  as="span"
                  className="bg-label-background-gray text-white uppercase px-2 py-1 rounded-[26px]"
                >
                  {t('signing.parsingCount', { current: decoded, total: total })}
                </CaptionText>
              </div>
            )}
          </footer>
        </div>
      </div>
    </>
  );
};
