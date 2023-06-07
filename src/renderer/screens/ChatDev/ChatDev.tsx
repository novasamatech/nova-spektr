/* eslint-disable i18next/no-literal-string */
import { useEffect, useState } from 'react';
import { Room } from 'matrix-js-sdk';

import { useMatrix } from '@renderer/context/MatrixContext';
import { MultisigTxFinalStatus } from '@renderer/domain/transaction';

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

  const handleUpdate = async (roomId: string) => {
    const updates = Array.from({ length: 1 }).map((_, index) => {
      return (async () => {
        await matrix.sendUpdate(roomId, {
          senderAccountId: '0x15hwmZknpCaGffUFKHSLz8wNeQPuhvdD5cc1o1AGiL4QHoU7',
          callData: '0x040300d02b1de0e29d201d48f1a48fb0ead05bf292366ffe90efec9368bb2c7849de590700e8764817',
          chainId: '0xChainId',
          callHash: '0x1d634bf912020a74f9634118e43d65dee6030235a356613ff6c32a37b8783013',
          description: 'Mst update',
          callTimepoint: { index: 2, height: 10 },
        });
      })();
    });

    Promise.all(updates).then(() => console.log(`=== ♻️ ${updates.length} Update Sent ===`));
  };

  const handleApprove = async (roomId: string) => {
    const approves = Array.from({ length: 1 }).map(() => {
      return (async () => {
        await matrix.sendApprove(roomId, {
          senderAccountId: '0x15hwmZknpCaGffUFKHSLz8wNeQPuhvdD5cc1o1AGiL4QHoU7',
          // callData: '0x040300d02b1de0e29d201d48f1a48fb0ead05bf292366ffe90efec9368bb2c7849de590700e8764817',
          chainId: '0xChainId',
          callHash: '0x1d634bf912020a74f9634118e43d65dee6030235a356613ff6c32a37b8783013',
          extrinsicHash: '0xExtrinsicHash',
          extrinsicTimepoint: { index: 2, height: 10 },
          callTimepoint: { index: 2, height: 10 },
          description: 'Approve',
          error: false,
        });
      })();
    });

    Promise.all(approves).then(() => console.log(`=== ✅ ${approves.length} Approves Sent ===`));
  };

  const handleFinalApprove = async (roomId: string) => {
    const finals = Array.from({ length: 1 }).map((_, index) => {
      return (async () => {
        await matrix.sendFinalApprove(roomId, {
          senderAccountId: '0x15hwmZknpCaGffUFKHSLz8wNeQPuhvdD5cc1o1AGiL4QHoU7',
          callData: '0x040300d02b1de0e29d201d48f1a48fb0ead05bf292366ffe90efec9368bb2c7849de590700e8764817',
          chainId: '0xChainId',
          callHash: '0x1d634bf912020a74f9634118e43d65dee6030235a356613ff6c32a37b8783013',
          extrinsicHash: '0xExtrinsicHash',
          extrinsicTimepoint: { index: 1, height: 20 },
          callTimepoint: { index: 2, height: 10 },
          callOutcome: MultisigTxFinalStatus.ESTABLISHED,
          description: 'Final approve',
          error: false,
        });
      })();
    });

    Promise.all(finals).then(() => console.log(`=== 🏁 ${finals.length} Final Approve Sent ===`));
  };

  const handleCancel = async (roomId: string) => {
    const cancels = Array.from({ length: 1 }).map((_, index) => {
      return (async () => {
        await matrix.sendCancel(roomId, {
          senderAccountId: '0x15hwmZknpCaGffUFKHSLz8wNeQPuhvdD5cc1o1AGiL4QHoU7',
          callData: '0x040300d02b1de0e29d201d48f1a48fb0ead05bf292366ffe90efec9368bb2c7849de590700e8764817',
          chainId: '0xChainId',
          callHash: '0x1d634bf912020a74f9634118e43d65dee6030235a356613ff6c32a37b8783013',
          extrinsicHash: '0xExtrinsicHash',
          extrinsicTimepoint: { index: 1, height: 30 },
          callTimepoint: { index: 2, height: 10 },
          description: 'Cancel',
          error: false,
        });
      })();
    });

    Promise.all(cancels).then(() => console.log(`=== ✅ ${cancels.length} Approves Sent ===`));
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
        <span className="text-lg block">Verification status: {matrix.sessionIsVerified.toString()}</span>
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
              <button type="button" className="border p-1" onClick={() => handleUnread()}>
                get unread
              </button>
              <button type="button" className="border p-1" onClick={() => handleUpdate(room.roomId)}>
                update
              </button>
              <button type="button" className="border p-1" onClick={() => handleApprove(room.roomId)}>
                approve
              </button>
              <button type="button" className="border p-1" onClick={() => handleFinalApprove(room.roomId)}>
                final_approve
              </button>
              <button type="button" className="border p-1" onClick={() => handleCancel(room.roomId)}>
                cancel
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChatDev;
