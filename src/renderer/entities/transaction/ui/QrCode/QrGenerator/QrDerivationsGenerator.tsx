import useGenerator from './common/useGenerator';
import { DEFAULT_FRAME_DELAY } from './common/constants';
import { type Address } from '@shared/core';
import { createDynamicDerivationPayload } from './common/utils';
import { type DynamicDerivationRequestInfo } from '../common/types';

type Props = {
  address: Address;
  derivations: DynamicDerivationRequestInfo[];
  size?: number;
  bgColor?: string;
  skipEncoding?: boolean;
  delay?: number;
};

export const QrDerivationsGenerator = ({
  address,
  derivations,
  size,
  skipEncoding = false,
  bgColor = 'none',
  delay = DEFAULT_FRAME_DELAY,
}: Props) => {
  const payload = createDynamicDerivationPayload(address, derivations);
  const image = useGenerator(payload, skipEncoding, delay, bgColor);

  if (!payload || !image) {
    return null;
  }

  return <div style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: image }} />;
};
