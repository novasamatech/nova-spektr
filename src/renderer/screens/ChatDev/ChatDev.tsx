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

  const handleApprove = async (roomId: string) => {
    const approves = Array.from({ length: 3 }).map((_, index) => {
      return (async () => {
        await matrix.mstApprove(roomId, {
          senderAddress: '15hwmZknpCaGffUFKHSLz8wNeQPuhvdD5cc1o1AGiL4QHoU7',
          chainId: '0x1',
          callHash: '0x2',
          callData: '0x3',
          extrinsicHash: '0x4',
          extrinsicTimepoint: {
            index: 2,
            height: 15345319,
          },
          callTimepoint: {
            index: 2,
            height: 15345319,
          },
          error: false,
          description: index.toString(),
        });
      })();
    });

    Promise.all(approves).then(() => console.log('=== Finish ==='));
  };

  const handleUnread = async () => {
    try {
      await matrix.syncSpektrTimeline();
    } catch (error) {
      console.warn(error);
    }
  };

  if (!isLoggedIn) {
    return <div className="flex flex-col gap-y-5 m-10">Logging in ...</div>;
  }

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
              <button type="button" className="border p-1" onClick={() => handleUnread()}>
                get unread
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChatDev;
