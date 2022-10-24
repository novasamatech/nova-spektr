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
    const value = 'hello test this is my message';
    setPayload(value);
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
