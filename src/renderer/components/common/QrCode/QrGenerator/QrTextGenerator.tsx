import { stringToU8a } from '@polkadot/util';
import { Encoder } from 'raptorq';

import useGenerator from './common/useGenerator';
import { DEFAULT_FRAME_DELAY } from './common/constants';

type Props = {
  size?: number;
  bgColor?: string;
  skipEncoding?: boolean;
  delay?: number;
  payload: string | Uint8Array;
  encoder?: Encoder;
};

const QrTextGenerator = ({
  payload,
  size,
  skipEncoding = false,
  delay = DEFAULT_FRAME_DELAY,
  bgColor = 'none',
  encoder,
}: Props) => {
  const image = useGenerator(
    payload instanceof Uint8Array ? payload : stringToU8a(payload),
    skipEncoding,
    delay,
    bgColor,
    encoder,
  );

  if (!payload || !image) {
    return null;
  }

  return <div style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: image }} />;
};

export default QrTextGenerator;
