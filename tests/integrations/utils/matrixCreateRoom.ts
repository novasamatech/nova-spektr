import Matrix, { RoomParams, Signatory } from '../../../src/renderer/services/matrix';

export async function createRoom(
  matrix: Matrix,
  roomName: string,
  creatorAccountName: string,
  threshold: number,
  otherSignatories: Signatory[],
): Promise<RoomParams> {
  const room = await matrix.startRoomCreation(roomName);

  const room_params: RoomParams = {
    roomId: room.roomId,
    signature: room.sign,
    accountName: creatorAccountName,
    mstAccountAddress: roomName,
    inviterPublicKey: room.sign,
    threshold: threshold,
    signatories: otherSignatories,
  };

  await matrix.finishRoomCreation(room_params);

  return room_params;
}
