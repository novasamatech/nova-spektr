import { signatureVerify } from '@polkadot/util-crypto';
import { useRef, useState } from 'react';

import { QrReader, QrTxGenerator } from '@renderer/components/common';
import { Command } from '@renderer/components/common/QrCode/QrGenerator/common/constants';
import { Button, Input } from '@renderer/components/ui';

const CameraDev = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [payload, setPayload] = useState<Uint8Array | string>();

  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [activeCameraId, setActiveCameraId] = useState('');

  const onSetPayload = () => {
    const value = 'hello test this is my message';
    setPayload(value);
  };

  const handleResult = (data: string) => {
    console.log('key ==> ', data);

    const { isValid } = signatureVerify(
      'hello test this is my message',
      data,
      '12YK3LD8FzVgyBuN6mQkCaZUHyExQdjyvX1Fn67DJ5A4rL2R',
    );
    console.log('isValid ==> ', isValid);
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
              onResult={handleResult}
              onError={(error) => console.warn(error)}
            />
            {/*<QrReader*/}
            {/*  cameraId={activeCameraId}*/}
            {/*  onCameraList={(cameras) => setAvailableCameras(cameras)}*/}
            {/*  onResult={(data) => console.info(data)}*/}
            {/*  onError={(error) => console.warn(error)}*/}
            {/*/>*/}
          </div>
        </div>
        <div>
          <div className="flex gap-x-3 mb-3">
            <Input placeholder="Qr payload" ref={inputRef} />
            <Button variant="fill" pallet="primary" onClick={onSetPayload}>
              Set payload
            </Button>
          </div>
          {payload && (
            // Fast test with Westend genesisHash
            <QrTxGenerator
              cmd={Command.Message}
              address="12YK3LD8FzVgyBuN6mQkCaZUHyExQdjyvX1Fn67DJ5A4rL2R"
              // address={inputRef.current?.value || ''}
              genesisHash="0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3"
              // genesisHash="0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e"
              // payload={payload}
              payload="<Bytes>hello test this is my message</Bytes>"
              size={200}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraDev;
