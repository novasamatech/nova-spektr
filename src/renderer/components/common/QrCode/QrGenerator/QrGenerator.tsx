import { stringToU8a } from '@polkadot/util';

import useGenerator from '@renderer/components/common/QrCode/QrGenerator/common/useGenerator';
import { COMMAND, DEFAULT_FRAME_DELAY } from './common/constants';
import { createSignPayload } from './common/utils';

interface BaseProps {
  size?: number;
  bgColor?: string;
  skipEncoding?: boolean;
  delay?: number;
}

interface TextProps extends BaseProps {
  payload: string;
}

interface TxProps extends BaseProps {
  address: string;
  cmd: COMMAND;
  payload: Uint8Array | string;
  genesisHash: Uint8Array | string;
}

export const QrTxGenerator = ({
  address,
  cmd,
  genesisHash,
  payload,
  size,
  skipEncoding = false,
  bgColor = 'none',
  delay = DEFAULT_FRAME_DELAY,
}: TxProps) => {
  const signPayload = createSignPayload(address, cmd, payload, genesisHash);

  const image = useGenerator(signPayload, skipEncoding, delay, bgColor);

  if (!signPayload || !image) {
    return null;
  }

  return <div data-testid="qr-tx" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: image }} />;
};

export const QrTextGenerator = ({
  payload,
  size,
  skipEncoding = false,
  delay = DEFAULT_FRAME_DELAY,
  bgColor = 'none',
}: TextProps) => {
  const image = useGenerator(stringToU8a(payload), skipEncoding, delay, bgColor);

  if (!payload || !image) {
    return null;
  }

  return (
    <div data-testid="qr-text" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: image }} />
  );
};
