import { useRef, useState } from 'react';

import { QrGenerator, QrReader } from '@renderer/components/common';
import { Button, Input } from '@renderer/components/ui';

const CameraDev = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [encodeString, setEncodeString] = useState('');

  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [activeCameraId, setActiveCameraId] = useState('');
  console.log(availableCameras);

  return (
    <div>
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
              onError={(error) => console.warn(error)}
            />
          </div>
        </div>
        <div>
          <div className="flex gap-x-3 mb-3">
            <Input placeholder="String to encode" ref={inputRef} />
            <Button variant="fill" pallet="primary" onClick={() => setEncodeString(inputRef.current?.value || '')}>
              Encode
            </Button>
          </div>
          <QrGenerator value={encodeString} />
        </div>
      </div>
    </div>
  );
};

export default CameraDev;
