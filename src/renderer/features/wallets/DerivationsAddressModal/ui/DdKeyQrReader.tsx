import { hexToU8a, isHex } from '@polkadot/util';
import { decodeAddress, encodeAddress, ethereumEncode } from '@polkadot/util-crypto';
import { useState } from 'react';

import { CryptoType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { Button, CaptionText, FootnoteText, Icon, Loader, SmallTitleText } from '@/shared/ui';
import { Select, ThemeProvider } from '@/shared/ui-kit';
import {
  type DdAddressInfoDecoded,
  type DdSeedInfo,
  type ErrorObject,
  QrError,
  QrReader,
  type VideoInput,
  WhiteTextButtonStyle,
} from '@/entities/transaction';

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

  const [activeCamera, setActiveCamera] = useState<string>();
  const [availableCameras, setAvailableCameras] = useState<Record<'title' | 'value', string>[]>([]);

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
    const formattedCameras = cameras.map((camera) => ({
      title: camera.label,
      value: camera.id,
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
    setActiveCamera(undefined);
    setProgress({ decoded: 0, total: 0 });
  };

  const onScanResult = (qrPayload: DdSeedInfo[]) => {
    try {
      const derivations: DdAddressInfoDecoded[] = [];
      for (const qr of qrPayload) {
        if (qr.multiSigner) {
          // Run encodeAddress to check we got valid address for public key
          encodeAddress(qr.multiSigner.public);
        }

        if (qr.dynamicDerivations.length === 0) continue;

        const derivationsAddressInfo = qr.dynamicDerivations.map((addressInfo) => {
          const publicKey = isHex(addressInfo.publicKey.public)
            ? hexToU8a(addressInfo.publicKey.public)
            : decodeAddress(addressInfo.publicKey.public);

          const isEthereum = addressInfo.encryption === CryptoType.ETHEREUM;

          return {
            ...addressInfo,
            publicKey: {
              MultiSigner: addressInfo.publicKey.MultiSigner,
              public: isEthereum ? ethereumEncode(publicKey) : encodeAddress(publicKey),
            },
          };
        });

        derivations.push(...derivationsAddressInfo);
      }

      setIsScanComplete(true);
      setTimeout(() => onResult(derivations), RESULT_DELAY);
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
    <ThemeProvider theme="dark">
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
        <div
          className={cnTw('relative overflow-hidden rounded-b-lg', isCameraPending && 'hidden', className)}
          style={sizeStyle}
        >
          <SmallTitleText
            as="h3"
            align="center"
            className={cnTw('absolute z-10 mt-4 w-full', isCameraOn && 'text-white')}
          >
            {t('onboarding.vault.scanTitle')}
          </SmallTitleText>
          <QrReader
            bgVideo
            size={size}
            cameraId={activeCamera}
            isDynamicDerivations
            className="relative top-[-24px] -scale-x-[1.125] scale-y-[1.125]"
            wrapperClassName="translate-y-[-84px]"
            onStart={() => setCameraState(CameraState.ACTIVE)}
            onCameraList={onCameraList}
            onProgress={setProgress}
            onResult={(result) => onScanResult(result as DdSeedInfo[])}
            onError={onError}
          />

          <div className="absolute bottom-[138px] z-10 w-full">
            <div className="mx-auto w-[208px]">
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
            </div>
          </div>

          <div className="absolute inset-0 mt-[58px] flex h-full w-full justify-center">
            {isScanComplete ? (
              <>
                <div className="rounded-2lg backdrop-blur-sm after:absolute after:inset-0 after:bg-white/50" />
                <Icon size={100} name="checkmarkCutout" className="text-success" />
              </>
            ) : (
              <Icon name="qrFrame" size={240} className="z-20 text-white" />
            )}
          </div>

          <footer className="absolute bottom-0 z-10 flex h-[66px] w-full items-center justify-between px-5">
            <Button
              variant="text"
              className={cnTw('h-6.5 px-4', isCameraOn ? WhiteTextButtonStyle : '')}
              onClick={onGoBack}
            >
              {t('operation.goBackButton')}
            </Button>

            {total > 1 && (
              <div className="z-10 flex items-center gap-x-2 rounded-2xl bg-black-background p-1.5 pl-3">
                <FootnoteText className="text-text-tertiary">{t('signing.parsingLabel')}</FootnoteText>
                <CaptionText
                  as="span"
                  className="rounded-[26px] bg-label-background-gray px-2 py-1 uppercase text-white"
                >
                  {t('signing.parsingCount', { current: decoded, total: total })}
                </CaptionText>
              </div>
            )}
          </footer>
        </div>
      </div>
    </ThemeProvider>
  );
};
