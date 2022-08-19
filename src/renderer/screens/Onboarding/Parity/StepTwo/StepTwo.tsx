import cn from 'classnames';
import { useState } from 'react';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';

import { OptionType } from '@renderer/components/ui/Dropdown/Dropdown';
import { ErrorObject, Errors } from '@renderer/components/common/QrCode/QrReader/common/types';
import { Button, Dropdown, Icon } from '@renderer/components/ui';
import { QrReader } from '@renderer/components/common';
import ScanQr from '@images/misc/onboarding/scan-qr.svg';

const enum CameraState {
  LOADING,
  SELECT,
  ERROR,
  BAD_CODE,
  DENY,
  ON,
}

type Props = {
  onNextStep: (ss58Address: string) => void;
};

const StepTwo = ({ onNextStep }: Props) => {
  const [cameraState, setCameraState] = useState<CameraState>(CameraState.LOADING);
  const [isCameraExist, setIsCameraExist] = useState(true);
  const [activeCamera, setActiveCamera] = useState<OptionType>();
  const [availableCameras, setAvailableCameras] = useState<OptionType[]>([]);

  const onScanResult = (data: string) => {
    console.info(data);

    const handleBadCode = () => {
      setCameraState(CameraState.BAD_CODE);
      setIsCameraExist(false);
      setActiveCamera(undefined);
    };

    const [_, ss58Address] = data.split(':');
    try {
      encodeAddress(decodeAddress(ss58Address));

      setTimeout(() => onNextStep(ss58Address), 500);
    } catch (error) {
      handleBadCode();
    }
  };

  const onError = (error: ErrorObject) => {
    console.warn(error);
    if (error.code === Errors.USER_DENY) {
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

  const onCameraList = (cameras: { id: string; label: string }[]) => {
    const formattedCameras = cameras.map((camera, index) => ({
      label: `${index + 1}. ${camera.label}`,
      value: camera.id,
    }));
    setAvailableCameras(formattedCameras);
    setCameraState(CameraState.SELECT);
  };

  // FIXME: investigate QrReader to make Retry
  const onRetryCamera = () => {
    setIsCameraExist(true);
    setCameraState(CameraState.LOADING);
  };

  const onRetryScan = () => {
    setIsCameraExist(true);
    setCameraState(CameraState.ON);
  };

  return (
    <div className="flex">
      <div className="flex-1">
        <img src={ScanQr} alt="Scan QR code from Parity Signer" width={500} height={440} />
        <h2 className="text-neutral-variant text-center py-5 px-10 leading-5">
          Scan <span className="font-bold">QR code</span> from Parity Signer
        </h2>
      </div>
      <div className="relative flex flex-col justify-center items-center flex-1 py-5 shadow-surface rounded-2lg bg-white overflow-hidden">
        {cameraState !== CameraState.ON && (
          <div className="flex items-center justify-center bg-white w-full h-full">
            {cameraState === CameraState.SELECT && (
              <div className="flex flex-col items-center text-center">
                <Icon className="text-neutral-variant" as="svg" name="warnCutout" size={60} />
                <p className="text-neutral text-xl leading-6 font-semibold mt-5">There are multiple cameras!</p>
                <p className="text-neutral-variant text-sm">Please choose one to continue</p>
              </div>
            )}
            {cameraState === CameraState.BAD_CODE && (
              <div className="flex flex-col items-center text-center">
                <Icon className="text-alert" as="svg" name="removeCutout" size={60} />
                <p className="text-neutral text-xl leading-6 font-semibold mt-5">Wrong QR code!</p>
                <p className="text-neutral-variant text-sm max-w-[290px]">
                  The scanned QR code doesn't contain valid network address. Please scan another one
                </p>
              </div>
            )}
            {cameraState === CameraState.ERROR && (
              <div className="flex flex-col items-center text-center">
                <Icon className="text-neutral-variant" as="svg" name="warnCutout" size={60} />
                <p className="text-neutral text-xl leading-6 font-semibold mt-5">Camera is not working!</p>
                <p className="text-neutral-variant text-sm">Please make sure you camera is turned on</p>
              </div>
            )}
            {cameraState === CameraState.DENY && (
              <div className="flex flex-col items-center text-center">
                <Icon className="text-neutral-variant" as="svg" name="warnCutout" size={60} />
                <p className="text-neutral text-xl leading-6 font-semibold mt-5">Access denied!</p>
                <p className="text-neutral-variant text-sm">Please make sure you grant access to camera</p>
              </div>
            )}
            {cameraState === CameraState.LOADING && (
              <Icon className="absolute text-shade-10" as="svg" name="qrSimple" size={66} />
            )}
            <Icon className="absolute text-shade-10" as="svg" name="qrFrame" size={320} />
          </div>
        )}

        {isCameraExist && (
          <div className={cn(cameraState !== CameraState.ON && 'hidden')}>
            <QrReader
              size={380}
              cameraId={activeCamera?.value}
              onCameraList={onCameraList}
              onResult={onScanResult}
              onStart={onCameraStart}
              onError={onError}
            />
          </div>
        )}

        {cameraState === CameraState.LOADING && (
          <p className="absolute bottom-5 flex items-center gap-x-2.5 text-alert font-semibold py-2">
            <Icon as="svg" name="loader" className="animate-spin" /> Starting camera
          </p>
        )}
        {cameraState === CameraState.SELECT && (
          <div className="absolute bottom-5 w-[242px]">
            <Dropdown
              placeholder="Select camera"
              selected={activeCamera}
              options={availableCameras}
              onSelected={setActiveCamera}
            />
          </div>
        )}
        {[CameraState.ERROR, CameraState.DENY].includes(cameraState) && (
          <Button
            className="absolute w-max bottom-5"
            weight="lg"
            variant="fill"
            pallet="primary"
            onClick={onRetryCamera}
          >
            Try again
          </Button>
        )}
        {cameraState === CameraState.BAD_CODE && (
          <Button className="absolute w-max bottom-5" weight="lg" variant="fill" pallet="primary" onClick={onRetryScan}>
            Scan again
          </Button>
        )}
      </div>
    </div>
  );
};

export default StepTwo;
