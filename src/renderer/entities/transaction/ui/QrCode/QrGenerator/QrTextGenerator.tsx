import { stringToU8a } from '@polkadot/util';

import { DEFAULT_FRAME_DELAY } from './common/constants';
import useGenerator from './common/useGenerator';

type Props = {
  size?: number;
  bgColor?: string;
  skipEncoding?: boolean;
  delay?: number;
  payload: string;
  className?: string;
};

export const QrTextGenerator = ({
  payload,
  size,
  skipEncoding = false,
  delay = DEFAULT_FRAME_DELAY,
  bgColor = 'none',
  className,
}: Props) => {
  const image = useGenerator(stringToU8a(payload), skipEncoding, delay, bgColor);

  if (!payload || !image) {
    return null;
  }

  return (
    <div style={{ width: size, height: size }} className={className} dangerouslySetInnerHTML={{ __html: image }} />
  );
};
