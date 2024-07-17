import { type Encoder } from 'raptorq';

import useGenerator from './common/useGenerator';
import { DEFAULT_FRAME_DELAY } from './common/constants';

type Props = {
  size?: number;
  bgColor?: string;
  skipEncoding?: boolean;
  delay?: number;
  payload: Uint8Array;
  encoder: Encoder;
};

export const QrMultiframeGenerator = ({
  payload,
  size,
  skipEncoding = false,
  delay = DEFAULT_FRAME_DELAY,
  bgColor = 'none',
  encoder,
}: Props) => {
  const image = useGenerator(payload, skipEncoding, delay, bgColor, encoder);

  if (!payload || !image || !encoder) {
    return null;
  }

  return <div style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: image }} />;
};
