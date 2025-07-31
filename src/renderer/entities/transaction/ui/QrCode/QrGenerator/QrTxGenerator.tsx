import init, { Encoder } from 'raptorq/raptorq';
import { useCallback, useEffect, useState } from 'react';

import { Skeleton } from '@/shared/ui-kit';

import { DEFAULT_FRAME_DELAY } from './common/constants';
import useGenerator from './common/useGenerator';

type Props = {
  payload: Uint8Array;
  size?: string;
  skipEncoding?: boolean;
  bgColor?: string;
  delay?: number;
};

export const QrTxGenerator = ({
  payload,
  size = '240px',
  skipEncoding = false,
  bgColor = 'none',
  delay = DEFAULT_FRAME_DELAY,
}: Props) => {
  const [encoder, setEncoder] = useState<Encoder>();

  const createEncoder = useCallback(async () => {
    try {
      await init();
      setEncoder(Encoder.with_defaults(payload, 128));
    } catch (error) {
      console.error('Failed to create encoder:', error);
    }
  }, [payload]);

  useEffect(() => {
    if (!skipEncoding) {
      createEncoder();
    }
  }, [createEncoder, skipEncoding]);

  const image = useGenerator(payload, skipEncoding, delay, bgColor, encoder);

  if (!image) {
    return <Skeleton width={size} height={size} />;
  }

  return <div style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: image }} />;
};
