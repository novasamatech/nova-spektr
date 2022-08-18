import { ReactNode, useState } from 'react';

import { Button, ButtonBack, Icon, Stepper, DropDown, Carousel } from '@renderer/components/ui';
import { OptionType } from '@renderer/components/ui/DropDown/DropDown';
import { ErrorObject } from '@renderer/components/common/QrCode/QrReader/common/types';
import { QrReader } from '@renderer/components/common';
import ScanQr from '@images/misc/onboarding/scan-qr.svg';
import SlideOne from '@images/misc/onboarding/slide-1.svg';
import SlideTwo from '@images/misc/onboarding/slide-2.svg';
import SlideThree from '@images/misc/onboarding/slide-3.svg';

const PARITY_FLOW_STEPS: Record<'title', string>[] = [
  { title: 'Prepare the QR code' },
  { title: 'Scan the QR code' },
  { title: 'Check the result' },
];

const CAROUSEL_SLIDES: ReactNode[] = [
  <>
    <img src={SlideOne} alt="Parity Signer application is being opened on your smartphone" width={500} height={385} />
    <div className="flex items-center justify-center h-15 px-5">
      <h2 className="text-neutral-variant text-center">
        Open the <span className="font-bold">Parity Signer</span> application on your smartphone
      </h2>
    </div>
  </>,
  <>
    <img src={SlideTwo} alt="'Keys' tab is opened with appropriate account" width={500} height={385} />
    <div className="flex items-center justify-center h-15 px-5">
      <h2 className="text-neutral-variant text-center">
        Go to “<span className="font-bold">Keys</span>” tab. Select <span className="font-bold">seed</span>, then
        account
        <br />
        you would like to add to Omni
      </h2>
    </div>
  </>,
  <>
    <img src={SlideThree} alt="Parity Signer built-in QR code" width={500} height={385} />
    <div className="flex items-center justify-center h-15 px-5">
      <h2 className="text-neutral-variant text-center">
        Parity Signer will provide you a <span className="font-bold">QR code</span> for scanning
      </h2>
    </div>
  </>,
];

const Parity = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [isCameraActive] = useState(false);
  const [activeCamera, setActiveCamera] = useState<OptionType>();
  const [availableCameras, setAvailableCameras] = useState<OptionType[]>([]);

  const onOpenCamera = () => {
    setActiveStep(1);
  };

  const onScanResult = (data: string) => {
    console.info(data);
  };

  const onError = (error: ErrorObject) => {
    console.warn(error);
  };

  const onCameraList = (cameras: { id: string; label: string }[]) => {
    const formattedCameras = cameras.map((camera, index) => ({
      label: `${index + 1}. ${camera.label}`,
      value: camera.id,
    }));
    setAvailableCameras(formattedCameras);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-x-2.5">
        <ButtonBack />
        <h1 className="text-neutral">Add wallet by Parity Signer</h1>
      </div>
      <section className="flex flex-col gap-y-16 h-max max-w-[1000px] w-full m-auto">
        <Stepper steps={PARITY_FLOW_STEPS} active={activeStep} />
        <div className="flex">
          <div className="flex-1">
            {activeStep === 0 && (
              <div className="w-[500px] h-[500px] mx-auto">
                <Carousel
                  loop
                  slides={CAROUSEL_SLIDES}
                  animationDuration={500}
                  autoplay={{
                    delay: 3000,
                    pauseOnMouseEnter: true,
                    disableOnInteraction: false,
                  }}
                />
              </div>
            )}
            {activeStep === 1 && (
              <>
                <img className="h-[440px] w-[500px] mx-auto" src={ScanQr} alt="Scan QR code from Parity Signer" />
                <h2 className="text-neutral-variant text-center py-5 px-10 leading-5">
                  Scan <span className="font-bold">QR code</span> from Parity Signer
                </h2>
              </>
            )}
          </div>
          <div className="flex flex-col items-center gap-y-[30px] flex-1 pt-20 shadow-surface rounded-2lg bg-white">
            {isCameraActive ? (
              <>
                <QrReader
                  size={320}
                  cameraId={activeCamera?.value}
                  onCameraList={onCameraList}
                  onResult={onScanResult}
                  onError={onError}
                />
                {availableCameras.length > 0 && (
                  <DropDown
                    className="w-[242px]"
                    placeholder="Select camera"
                    selected={activeCamera}
                    options={availableCameras}
                    onSelected={setActiveCamera}
                  />
                )}
              </>
            ) : (
              <>
                <div className="flex justify-center items-center flex-1 relative text-shade-10 w-full h-full">
                  <Icon className="absolute" as="svg" name="qrSimple" size={66} />
                  <Icon className="absolute" as="svg" name="qrFrame" size={320} />
                </div>
                <Button className="w-max mb-5" weight="lg" variant="fill" pallet="primary" onClick={onOpenCamera}>
                  Scan QR code from Parity Signer
                </Button>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Parity;
