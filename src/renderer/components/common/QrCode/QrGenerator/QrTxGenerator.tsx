import useGenerator from './common/useGenerator';
import { Command, DEFAULT_FRAME_DELAY } from './common/constants';
import { createSignPayload } from './common/utils';
import { ChainId } from '@renderer/domain/shared-kernel';

type Props = {
  size?: number;
  bgColor?: string;
  skipEncoding?: boolean;
  delay?: number;
  address: string;
  cmd: Command;
  payload: Uint8Array | string;
  genesisHash: Uint8Array | ChainId;
};

export const QrTxGenerator = ({
  address,
  cmd,
  genesisHash,
  payload,
  size,
  skipEncoding = false,
  bgColor = 'none',
  delay = DEFAULT_FRAME_DELAY,
}: Props) => {
  const signPayload = createSignPayload(address, cmd, payload, genesisHash);

  const image = useGenerator(signPayload, skipEncoding, delay, bgColor);

  if (!signPayload || !image) {
    return null;
  }

  return <div style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: image }} />;
};

export default QrTxGenerator;
