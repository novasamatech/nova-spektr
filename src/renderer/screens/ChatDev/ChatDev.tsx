import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Room } from 'matrix-js-sdk';
import cn from 'classnames';

import { useMatrix } from '@renderer/context/MatrixContext';
import { Membership } from '@renderer/services/matrix';

const ChatDev = () => {
  const { matrix } = useMatrix();
  const keyRef = useRef<HTMLInputElement>(null);
  const phraseRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    setRooms(matrix.listOfOmniRooms(Membership.JOIN));
  }, []);

  const handleSetRoom = (roomId: string) => {
    matrix.setActiveRoom(roomId);
  };

  const handleLeaveRoom = (roomId: string) => {
    matrix.leaveRoom(roomId);
  };

  const handleVerifyKey = async () => {
    try {
      await matrix.verifyWithKey(keyRef.current?.value || '');
    } catch (error) {
      console.warn(error);
    }
  };

  const handleVerifyPhrase = async () => {
    try {
      await matrix.verifyWithPhrase(phraseRef.current?.value || '');
    } catch (error) {
      console.warn(error);
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;

    try {
      await matrix.verifyWithFile(event.target.files[0]);
    } catch (error) {
      console.warn(error);
    }
  };

  // const handleInit = () => {
  //   matrix.mstInitiate({
  //     salt: '123',
  //     callData: '0xdata',
  //     callHash: '0xhash',
  //     chainId: '0xchain',
  //     senderAddress: '5GmedEVixRJoE8TjMePLqz7DnnQG1d5517sXdiAvAF2t7EYW',
  //   });
  // };

  // const handleApprove = () => {
  //   matrix.mstApprove({
  //     salt: '123',
  //     callHash: '0xhash',
  //     chainId: '0xchain',
  //     senderAddress: '5GmedEVixRJoE8TjMePLqz7DnnQG1d5517sXdiAvAF2t7EYW',
  //   });
  // };

  return (
    <div>
      <div>
        <span className="text-lg block">
          {/* eslint-disable-next-line */}
          Verification status:{' '}
          <span className={cn(matrix.isVerified ? 'text-green-500' : 'text-red-500')}>
            {/* eslint-disable-next-line */}
            {matrix.isVerified.toString()}
          </span>
        </span>
        <span className="block">
          {/* eslint-disable-next-line */}
          Session Key: <span className="text-gray-600">{matrix.sessionKey}</span>
        </span>
      </div>
      <div className="flex flex-col w-[500px] gap-y-3 mt-3">
        <div className="flex gap-x-3">
          <input ref={keyRef} type="text" className="flex-1 border-2 rounded-lg px-2" />
          <button type="button" className="basis-44 border p-1 bg-green-200 rounded-lg" onClick={handleVerifyKey}>
            {/* eslint-disable-next-line */}
            verify with key
          </button>
        </div>
        <div className="flex gap-x-3">
          <input ref={phraseRef} type="text" className="flex-1 border-2 rounded-lg px-2" />
          <button type="button" className="basis-44 border p-1 bg-green-200 rounded-lg" onClick={handleVerifyPhrase}>
            {/* eslint-disable-next-line */}
            verify with phrase
          </button>
        </div>
        <div className="flex gap-x-3 items-center">
          <input ref={uploadRef} type="file" className="flex-1 rounded-lg border-2" onChange={handleFileChange} />
          <button
            type="button"
            className="basis-44 border p-1 bg-blue-300 rounded-lg"
            onClick={() => uploadRef.current?.click()}
          >
            {/* eslint-disable-next-line */}
            upload file
          </button>
        </div>
        {/*<div>*/}
        {/*  <button type="button" className="bg-orange-300 min-w-[60px] border p-1 mr-2 rounded-lg" onClick={handleInit}>*/}
        {/*    init*/}
        {/*  </button>*/}
        {/*  <button type="button" className="bg-orange-300 min-w-[60px] border p-1 rounded-lg" onClick={handleApprove}>*/}
        {/*    approve*/}
        {/*  </button>*/}
        {/*</div>*/}
      </div>
      <ul>
        {rooms.map((room) => (
          <li key={room.roomId}>
            {room.name}
            <button type="button" className="border ml-1 p-1" onClick={() => handleSetRoom(room.roomId)}>
              {/* eslint-disable-next-line */}
              set room
            </button>
            <button type="button" className="border ml-1 p-1" onClick={() => handleLeaveRoom(room.roomId)}>
              {/* eslint-disable-next-line */}
              leave room
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChatDev;
