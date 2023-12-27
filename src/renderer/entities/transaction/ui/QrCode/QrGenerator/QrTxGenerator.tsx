import { u8aConcat } from '@polkadot/util';

import useGenerator from './common/useGenerator';
import { DEFAULT_FRAME_DELAY, SUBSTRATE_ID } from './common/constants';
import { createSubstrateSignPayload } from './common/utils';
import type { ChainId } from '@shared/core';
import { SigningType } from '@shared/core';

type Props = {
  address: string;
  signingType: SigningType;
  genesisHash: Uint8Array | ChainId;
  payload: Uint8Array | string;
  derivationPath?: string;
  size?: number;
  skipEncoding?: boolean;
  bgColor?: string;
  delay?: number;
};

export const QrTxGenerator = ({
  address,
  signingType,
  genesisHash,
  payload,
  derivationPath,
  size,
  skipEncoding = false,
  bgColor = 'none',
  delay = DEFAULT_FRAME_DELAY,
}: Props) => {
  const signPayload = u8aConcat(
    SUBSTRATE_ID,
    createSubstrateSignPayload(address, payload, genesisHash, signingType, derivationPath),
  );

  const image = useGenerator(signPayload, skipEncoding, delay, bgColor);

  if (!signPayload || !image) return null;

  return <div style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: image }} />;
};
