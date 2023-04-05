/* eslint-disable i18next/no-literal-string */
import { useEffect, useState } from 'react';
import { Room } from 'matrix-js-sdk';

import { useMatrix } from '@renderer/context/MatrixContext';

const ChatDev = () => {
  const { matrix, isLoggedIn } = useMatrix();

  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    if (!isLoggedIn) return;

    setRooms(matrix.joinedRooms());
  }, [isLoggedIn]);

  const handleLeaveRoom = (roomId: string) => {
    matrix.leaveRoom(roomId);
  };
  const handleApprove = (roomId: string) => {
    // matrix.mstApprove({
    //   salt: '123',
    //   callHash: '0xhash',
    //   chainId: '0xchain',
    //   senderAddress: '5GmedEVixRJoE8TjMePLqz7DnnQG1d5517sXdiAvAF2t7EYW',
    // });
  };

  return (
    <div className="flex flex-col gap-y-5 m-10">
      <div>
        <span className="text-lg block">Verification status: {matrix.userIsVerified.toString()}</span>
        <span className="text-lg block">{`Session Key: ${matrix.sessionKey}`}</span>
      </div>
      <ul className="max-w-[650px]">
        {rooms.map((room, index) => (
          <li key={room.roomId} className="py-2 border-b border-b-gray-500">
            <p>
              {index + 1}. {room.name} - {room.roomId}
            </p>
            <div className="flex gap-x-4 items-center">
              <button type="button" className="border ml-1 p-1" onClick={() => handleLeaveRoom(room.roomId)}>
                leave room
              </button>
              <button type="button" className="border p-1" onClick={() => handleApprove(room.roomId)}>
                approve
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChatDev;
