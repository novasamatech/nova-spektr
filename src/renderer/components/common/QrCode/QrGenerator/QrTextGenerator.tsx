import { stringToU8a } from '@polkadot/util';

import useGenerator from './common/useGenerator';
import { DEFAULT_FRAME_DELAY } from './common/constants';

type Props = {
  size?: number;
  bgColor?: string;
  skipEncoding?: boolean;
  delay?: number;
  payload: string;
};

const QrTextGenerator = ({
  payload,
  size,
  skipEncoding = false,
  delay = DEFAULT_FRAME_DELAY,
  bgColor = 'none',
}: Props) => {
  const image = useGenerator(stringToU8a(payload), skipEncoding, delay, bgColor);

  if (!payload || !image) {
    return null;
  }

  return <div style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: image }} />;
};

export default QrTextGenerator;
