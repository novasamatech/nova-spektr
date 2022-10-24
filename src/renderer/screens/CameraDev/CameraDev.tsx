import { signatureVerify } from '@polkadot/util-crypto';
import { useRef, useState } from 'react';

import { QrReader, QrTxGenerator } from '@renderer/components/common';
import { Command } from '@renderer/components/common/QrCode/QrGenerator/common/constants';
import { VideoInput } from '@renderer/components/common/QrCode/QrReader/common/types';
import { Button, Input } from '@renderer/components/ui';

const CameraDev = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [payload, setPayload] = useState<Uint8Array | string>();

  const [availableCameras, setAvailableCameras] = useState<VideoInput[]>([]);
  const [activeCameraId, setActiveCameraId] = useState('');

  const onSetPayload = () => {
    setPayload('<Bytes>hello test this is my message</Bytes>');
  };

  const onCheckSignature = () => {
    // Pavel's signature & address
    const signature =
      '0xd469609af86830c83972a4d05cf5c8641577ed74b17e3db247025da641f6cf0b02e681a9ffb3c1d558b1dbd8294c22a1863d91e231037aa099ac33d8a3825286';
    const address = '12YK3LD8FzVgyBuN6mQkCaZUHyExQdjyvX1Fn67DJ5A4rL2R';
    const verification = signatureVerify('hello test this is my message', signature, address);

    console.log('isValid ==> ', verification);
  };

  return (
    <div>
      {/* eslint-disable i18next/no-literal-string */}
      <h2>Camera Dev</h2>
      <div className="flex justify-between">
        <div>
          <p className="mt-3">List of available cameras:</p>
          {availableCameras.length > 0 ? (
            <ul className="mb-3">
              {availableCameras.map((c) => (
                <li key={c.id} className="flex gap-x-3">
                  <span>
                    {c.id} - {c.label}
                  </span>
                  <Button variant="outline" pallet="primary" onClick={() => setActiveCameraId(c.id)}>
                    Select
                  </Button>
                </li>
              ))}
              <li className="flex gap-x-3">
                <span>Test id - Test camera name</span>
                <Button variant="outline" pallet="primary" onClick={() => setActiveCameraId('121212')}>
                  Select
                </Button>
              </li>
            </ul>
          ) : (
            <p>No cameras found</p>
          )}
          <div className="flex justify-between">
            <QrReader
              cameraId={activeCameraId}
              onCameraList={(cameras) => setAvailableCameras(cameras)}
              onResult={(data) => console.info(data)}
              onStart={() => console.info('start camera')}
              onError={(error) => console.warn(error)}
            />
          </div>
        </div>
        <div>
          <div className="flex gap-x-3 items-center mb-3">
            <Button weight="lg" variant="fill" pallet="alert" onClick={onCheckSignature}>
              Check Parity signature
            </Button>
            <Input placeholder="Address" ref={inputRef} />
            <Button weight="lg" variant="fill" pallet="primary" onClick={onSetPayload}>
              Set payload
            </Button>
          </div>
          {payload && (
            // Fast test with Westend genesisHash
            <QrTxGenerator
              cmd={Command.Message}
              address={inputRef.current?.value || ''}
              genesisHash="0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e"
              payload={payload}
              size={200}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraDev;
